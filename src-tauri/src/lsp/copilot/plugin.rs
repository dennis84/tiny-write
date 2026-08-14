use tauri::{AppHandle, Runtime};

use crate::lsp::server::LspServer;
use tokio::task::JoinHandle;

pub const PLUGIN_NAME: &str = "TinyWrite Copilot";

pub fn create_server<R: Runtime>(app_handle: &AppHandle<R>) -> (LspServer, JoinHandle<()>) {
    LspServer::new(
        PLUGIN_NAME.to_string(),
        "copilot-language-server --stdio",
        app_handle,
    )
}
