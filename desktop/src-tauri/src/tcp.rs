//! Plain TCP for Wi-Fi instruments, e.g. the NMEA 0183 server of the Pcnautic / pypilot
//! autopilot on 192.168.14.1:20220. A web page can't open TCP sockets, so the page asks Rust.
//!
//! Every chunk read is handed to `emit` (the app sends it to the page as a `tcp-data` event),
//! and `Closed` when the other side closes the socket or reading fails (`tcp-closed`).
//! The page (pwa/src/services/connections/NativeTcpConnection.ts) splits the chunks into lines
//! and reconnects. Ids come from the page, one per attempt, so it knows a socket's events
//! before `connect` returns.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::tcp::OwnedWriteHalf;
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct DataEvent {
    pub id: String,
    pub data: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct ClosedEvent {
    pub id: String,
    pub error: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum TcpEvent {
    Data(DataEvent),
    Closed(ClosedEvent),
}

struct Socket {
    writer: OwnedWriteHalf,
    reader: JoinHandle<()>,
}

/// The open sockets by id
#[derive(Clone, Default)]
pub struct Sockets(Arc<Mutex<HashMap<String, Socket>>>);

impl Sockets {
    /// Open a socket and read it until it closes. Errors are messages for the user.
    pub async fn connect<F>(&self, id: String, host: &str, port: u16, emit: F) -> Result<(), String>
    where
        F: Fn(TcpEvent) + Send + Sync + 'static,
    {
        let stream = tokio::time::timeout(CONNECT_TIMEOUT, TcpStream::connect((host, port)))
            .await
            .map_err(|_| format!("no answer within {} s", CONNECT_TIMEOUT.as_secs()))?
            .map_err(|error| error.to_string())?;
        let _ = stream.set_nodelay(true);
        let (mut reader, writer) = stream.into_split();

        // Hold the lock until the socket is in the map, so the reader can't remove it first
        let mut sockets = self.0.lock().await;
        let all = self.clone();
        let reader_id = id.clone();
        let task = tokio::spawn(async move {
            let mut buffer = vec![0u8; 4096];
            let error = loop {
                match reader.read(&mut buffer).await {
                    Ok(0) => break None,
                    // NMEA is ASCII; anything else must not stop the stream
                    Ok(n) => emit(TcpEvent::Data(DataEvent {
                        id: reader_id.clone(),
                        data: String::from_utf8_lossy(&buffer[..n]).into_owned(),
                    })),
                    Err(error) => break Some(error.to_string()),
                }
            };
            all.0.lock().await.remove(&reader_id);
            emit(TcpEvent::Closed(ClosedEvent {
                id: reader_id,
                error,
            }));
        });
        if let Some(old) = sockets.insert(
            id,
            Socket {
                writer,
                reader: task,
            },
        ) {
            old.reader.abort();
        }
        Ok(())
    }

    pub async fn write(&self, id: &str, data: &str) -> Result<(), String> {
        let mut sockets = self.0.lock().await;
        let socket = sockets
            .get_mut(id)
            .ok_or_else(|| "not connected".to_string())?;
        socket
            .writer
            .write_all(data.as_bytes())
            .await
            .map_err(|error| error.to_string())
    }

    /// Close a socket. No `Closed` event follows: the page asked for it.
    pub async fn disconnect(&self, id: &str) {
        let socket = self.0.lock().await.remove(id);
        if let Some(mut socket) = socket {
            socket.reader.abort();
            let _ = socket.writer.shutdown().await;
        }
    }

    #[cfg(test)]
    async fn is_open(&self, id: &str) -> bool {
        self.0.lock().await.contains_key(id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::net::TcpListener;
    use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver};

    async fn listener() -> (TcpListener, u16) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        (listener, port)
    }

    async fn connect(sockets: &Sockets, id: &str, port: u16) -> UnboundedReceiver<TcpEvent> {
        let (tx, rx) = unbounded_channel();
        sockets
            .connect(id.into(), "127.0.0.1", port, move |event| {
                let _ = tx.send(event);
            })
            .await
            .unwrap();
        rx
    }

    async fn next(rx: &mut UnboundedReceiver<TcpEvent>) -> TcpEvent {
        tokio::time::timeout(Duration::from_secs(5), rx.recv())
            .await
            .unwrap()
            .unwrap()
    }

    /// The data events up to `len` bytes, joined
    async fn read_text(rx: &mut UnboundedReceiver<TcpEvent>, len: usize) -> String {
        let mut text = String::new();
        while text.len() < len {
            match next(rx).await {
                TcpEvent::Data(event) => text.push_str(&event.data),
                other => panic!("expected data, got {other:?}"),
            }
        }
        text
    }

    #[tokio::test]
    async fn reads_what_the_autopilot_sends_until_it_closes() {
        let (listener, port) = listener().await;
        let sockets = Sockets::default();
        let mut rx = connect(&sockets, "wifi#1", port).await;
        let (mut peer, _) = listener.accept().await.unwrap();

        let sentences = "$APHDM,123.4,M*3A\r\n$APRSA,-5.0,A,,V*7B\r\n";
        peer.write_all(sentences.as_bytes()).await.unwrap();
        assert_eq!(read_text(&mut rx, sentences.len()).await, sentences);

        drop(peer);
        assert_eq!(
            next(&mut rx).await,
            TcpEvent::Closed(ClosedEvent {
                id: "wifi#1".into(),
                error: None
            })
        );
        assert!(!sockets.is_open("wifi#1").await);
    }

    #[tokio::test]
    async fn writes_to_the_socket() {
        let (listener, port) = listener().await;
        let sockets = Sockets::default();
        let _rx = connect(&sockets, "wifi#1", port).await;
        let (mut peer, _) = listener.accept().await.unwrap();

        sockets.write("wifi#1", "$GPAPB,test*00\r\n").await.unwrap();
        let mut buffer = [0u8; 16];
        peer.read_exact(&mut buffer).await.unwrap();
        assert_eq!(&buffer, b"$GPAPB,test*00\r\n");
        assert_eq!(
            sockets.write("other", "x").await,
            Err("not connected".into())
        );
    }

    #[tokio::test]
    async fn disconnect_closes_the_socket_without_an_event() {
        let (listener, port) = listener().await;
        let sockets = Sockets::default();
        let mut rx = connect(&sockets, "wifi#1", port).await;
        let (mut peer, _) = listener.accept().await.unwrap();

        sockets.disconnect("wifi#1").await;
        assert!(!sockets.is_open("wifi#1").await);
        // The autopilot sees the socket close
        let mut buffer = [0u8; 1];
        let read = tokio::time::timeout(Duration::from_secs(5), peer.read(&mut buffer))
            .await
            .unwrap();
        assert!(matches!(read, Ok(0) | Err(_)));
        // The reader was stopped, so it sends nothing more
        let after = tokio::time::timeout(Duration::from_millis(200), rx.recv()).await;
        assert!(matches!(after, Err(_) | Ok(None)));
    }

    #[tokio::test]
    async fn reports_an_address_where_nothing_listens() {
        let (listener, port) = listener().await;
        drop(listener);
        let sockets = Sockets::default();
        let result = sockets
            .connect("wifi#1".into(), "127.0.0.1", port, |_| {})
            .await;
        assert!(result.is_err());
        assert!(!sockets.is_open("wifi#1").await);
    }

    #[tokio::test]
    async fn keeps_sockets_apart() {
        let (listener, port) = listener().await;
        let sockets = Sockets::default();
        let mut first = connect(&sockets, "a#1", port).await;
        let (mut peer_a, _) = listener.accept().await.unwrap();
        let mut second = connect(&sockets, "b#1", port).await;
        let (mut peer_b, _) = listener.accept().await.unwrap();

        peer_a.write_all(b"$A*00\r\n").await.unwrap();
        peer_b.write_all(b"$B*00\r\n").await.unwrap();
        assert_eq!(read_text(&mut first, 7).await, "$A*00\r\n");
        assert_eq!(read_text(&mut second, 7).await, "$B*00\r\n");
    }
}
