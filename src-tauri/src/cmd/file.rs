use std::fs;
use chrono::{DateTime, Utc};

#[tauri::command]
pub fn get_mime_type(path: String) -> String {
    let guess = mime_guess::from_path(path);
    guess.first_raw().unwrap_or("").to_string()
}

#[tauri::command]
pub fn get_file_last_modified(path: String) -> Result<String, String> {
    let metadata = fs::metadata(&path)
        .map_err(|_| format!("Could not get metadata of file: {}", path))?;

    if let Ok(time) = metadata.modified() {
        let dt: DateTime<Utc> = time.into();
        Ok(dt.to_rfc3339())
    } else {
        Err("Not supported on this platform".to_string())
    }
}
