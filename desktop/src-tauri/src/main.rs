// OpenSail for Windows: the web app in pwa/ (built with `npm run build:native`) in a window,
// plus what a browser can't do: plain TCP to the instruments (tcp.rs) and fetching the charts
// from GitHub without CORS (tauri-plugin-http).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tcp;

use tauri::{AppHandle, Emitter, Manager, State, WebviewWindowBuilder};
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

/// wry's own WebView2 arguments, which setting additional_browser_args replaces
const WEBVIEW2_DEFAULT_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection";

/// The window from tauri.conf.json ("create": false). With OPENSAIL_DEVTOOLS_PORT set, WebView2
/// opens its DevTools port for the smoke test (desktop/smoke); WebView2 ignores
/// WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS when the app passes its own arguments.
fn create_main_window(app: &tauri::App) -> tauri::Result<()> {
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == "main")
        .expect("tauri.conf.json has a main window")
        .clone();
    let mut window = WebviewWindowBuilder::from_config(app.handle(), &config)?;
    if let Ok(port) = std::env::var("OPENSAIL_DEVTOOLS_PORT") {
        window = window.additional_browser_args(&format!(
            "{WEBVIEW2_DEFAULT_ARGS} --remote-debugging-port={port}"
        ));
    }
    window.build()?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .manage(Sockets::default())
        .setup(|app| Ok(create_main_window(app)?))
        .invoke_handler(tauri::generate_handler![
            tcp_connect,
            tcp_write,
            tcp_disconnect
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenSail");
}
