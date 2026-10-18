// OpenSail for Windows: the web app in pwa/ (built with `npm run build:native`) in a window,
// plus what a browser can't do: plain TCP to the instruments (tcp.rs) and fetching the charts
// from GitHub without CORS (tauri-plugin-http).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tcp;

use tauri::{AppHandle, Emitter, State};
use tcp::{Sockets, TcpEvent};

/// Open a TCP socket. Its data arrives as `tcp-data` events, its end as `tcp-closed`.
#[tauri::command]
async fn tcp_connect(
    app: AppHandle,
    sockets: State<'_, Sockets>,
    id: String,
    host: String,
    port: u16,
) -> Result<(), String> {
    sockets
        .connect(id, &host, port, move |event| {
            let _ = match event {
                TcpEvent::Data(event) => app.emit("tcp-data", event),
                TcpEvent::Closed(event) => app.emit("tcp-closed", event),
            };
        })
        .await
}

#[tauri::command]
async fn tcp_write(sockets: State<'_, Sockets>, id: String, data: String) -> Result<(), String> {
    sockets.write(&id, &data).await
}

#[tauri::command]
async fn tcp_disconnect(sockets: State<'_, Sockets>, id: String) -> Result<(), String> {
    sockets.disconnect(&id).await;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .manage(Sockets::default())
        .invoke_handler(tauri::generate_handler![
            tcp_connect,
            tcp_write,
            tcp_disconnect
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenSail");
}
