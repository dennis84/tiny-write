use ropey::Rope;
use std::{sync::Arc, time::Duration};
use tauri::{Runtime, Manager};
use tokio::sync::Mutex;

use crate::editor_state::EditorState;

#[derive(Clone, Debug, serde::Deserialize)]
pub struct Insert {
    from: usize,
    text: String,
}

#[derive(Clone, Debug, serde::Deserialize)]
pub struct Delete {
    from: usize,
    to: usize,
}

#[tauri::command]
pub async fn read_text<R: Runtime>(
    path: String,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<String> {
    let state = app_handle.state::<Arc<Mutex<EditorState>>>();
    let mut state = state.lock().await;
    let doc = state.load_document(path)?;
    Ok(doc.text.to_string())
}

#[tauri::command]
pub async fn write_text<R: Runtime>(
    path: String,
    data: String,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<()> {
    let state = app_handle.state::<Arc<Mutex<EditorState>>>();
    let mut state = state.lock().await;
    let doc = state.get_document(path.clone())?;

    doc.text = Rope::from_str(&data);
    doc.changed = true;

    state.debounced_write_tx.send(path, Duration::from_millis(3000))?;

    Ok(())
}

#[tauri::command]
pub async fn insert_text<R: Runtime>(
    path: String,
    data: Insert,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<()> {
    let state = app_handle.state::<Arc<Mutex<EditorState>>>();
    let mut state = state.lock().await;
    let doc = state.get_document(path.clone())?;

    doc.text.insert(data.from, &data.text);
    doc.changed = true;

    state.debounced_write_tx.send(path, Duration::from_millis(3000))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_text<R: Runtime>(
    path: String,
    data: Delete,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<()> {
    let state = app_handle.state::<Arc<Mutex<EditorState>>>();
    let mut state = state.lock().await;
    let doc = state.get_document(path.clone())?;

    doc.text.remove(data.from..data.to);
    doc.changed = true;

    state.debounced_write_tx.send(path, Duration::from_millis(3000))?;

    Ok(())
}
