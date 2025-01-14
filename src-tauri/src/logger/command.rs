use tracing::{debug, error, info, warn};

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
