use std::fs;
use chrono::{DateTime, Utc};

#[tauri::command]
pub fn get_mime_type(path: String) -> String {
    let guess = mime_guess::from_path(path);
    guess.first_raw().unwrap_or("").to_string()
}

#[tauri::command]
pub fn read_file_string(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|_| "Could not read file".to_string())
}

#[tauri::command]
pub fn read_file_base64(path: String) -> Result<String, String> {
    fs::read(path)
        .map(|xs| base64::encode(xs))
        .map_err(|_| "Could not read file".to_string())
}

#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(path, contents).map_err(|_| "Could not write file".to_string())
}

#[tauri::command]
pub fn get_file_last_modified(path: String) -> Result<String, String> {
    let metadata = fs::metadata(path)
        .map_err(|_| "Could not get metadata".to_string())?;

    if let Ok(time) = metadata.modified() {
        let dt: DateTime<Utc> = time.into();
        Ok(dt.to_rfc3339())
    } else {
        Err("Not supported on this platform".to_string())
    }
}
