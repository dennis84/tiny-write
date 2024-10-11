use chrono::{DateTime, Utc};
use std::{fs, time::SystemTime};

#[tauri::command]
pub fn get_mime_type(path: String) -> String {
    let guess = mime_guess::from_path(path);
    guess.first_raw().unwrap_or("").to_string()
}

#[tauri::command]
pub fn get_file_last_modified(path: String) -> tauri::Result<String> {
    let metadata = fs::metadata(path)?;

    let last_modified = metadata.modified().map(|time: SystemTime| {
        let dt: DateTime<Utc> = time.into();
        dt.to_rfc3339()
    })?;

    Ok(last_modified)
}
