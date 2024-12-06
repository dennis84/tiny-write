use chrono::{DateTime, Utc};
use std::{fs, path::PathBuf, time::SystemTime};

#[tauri::command]
pub fn get_mime_type(path: PathBuf) -> String {
    let guess = mime_guess::from_path(path.as_path());
    let mime = guess.first_raw().unwrap_or("");
    match mime {
        "video/vnd.dlna.mpeg-tts" => "application/typescript".to_string(),
        _ => mime.to_string(),
    }
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
