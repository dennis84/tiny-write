use std::fs;
use chrono::{DateTime, Utc};
use std::io::{Read};

#[tauri::command]
pub fn get_mime_type(path: String) -> String {
    let guess = mime_guess::from_path(path);
    guess.first_raw().unwrap_or("").to_string()
}

#[tauri::command]
pub fn read_file_string(path: String) -> Result<String, String> {
    let mut string = String::new();
    let mut file = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(&path)
        .map_err(|_| format!("Cannot read and write to file: {}", path))?;
    file.read_to_string(&mut string)
        .map_err(|_| format!("Could not read file: {}", path))?;
    Ok(string)
}

#[tauri::command]
pub fn read_file_base64(path: String) -> Result<String, String> {
    fs::read(&path)
        .map(|xs| base64::encode(xs))
        .map_err(|_| format!("Could not read file: {}", path))
}

#[tauri::command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|_| format!("Could not write file: {}", path))
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
