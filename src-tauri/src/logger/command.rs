use tauri::{Manager, ResourceId, Result, Runtime, Webview};
use tracing::span::EnteredSpan;
use tracing::{debug, error, info, span, warn, Level};

#[allow(dead_code)]
struct SendEnteredSpan(EnteredSpan);

unsafe impl Send for SendEnteredSpan {}

impl tauri::Resource for SendEnteredSpan {}

#[tauri::command]
pub fn log_debug(message: String) {
    debug!(message);
}

#[tauri::command]
pub fn log_info(message: String) {
    info!(message);
}

#[tauri::command]
pub fn log_warn(message: String) {
    warn!(message);
}

#[tauri::command]
pub fn log_error(message: String) {
    error!(message);
}

#[tauri::command]
pub fn log_span_start<R: Runtime>(webview: Webview<R>, name: String) -> ResourceId {
    let mut resources_table = webview.resources_table();
    let span = span!(Level::TRACE, "span_command", name = name).entered();
    resources_table.add(SendEnteredSpan(span))
}

#[tauri::command]
pub fn log_span_end<R: Runtime>(webview: Webview<R>, rid: ResourceId) -> Result<()> {
    let mut resources_table = webview.resources_table();
    resources_table.take::<SendEnteredSpan>(rid)?;
    Ok(())
}
