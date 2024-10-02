use ropey::Rope;
use std::sync::Arc;
use tauri::{Emitter, State};
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
pub async fn read_text(
    path: String,
    state: State<'_, Arc<Mutex<EditorState>>>,
) -> tauri::Result<String> {
    let mut state = state.lock().await;
    let doc = state.load_document(path)?;
    Ok(doc.text.to_string())
}

#[tauri::command]
pub async fn write_text(
    path: String,
    data: String,
    state: State<'_, Arc<Mutex<EditorState>>>,
    app_handle: tauri::AppHandle,
) -> tauri::Result<()> {
    let mut state = state.lock().await;
    let doc = state.get_document(path.clone())?;

    doc.text = Rope::from_str(&data);
    doc.changed = true;
    app_handle.emit("write_documents", path.clone())?;

    Ok(())
}

#[tauri::command]
pub async fn insert_text(
    path: String,
    data: Insert,
    state: State<'_, Arc<Mutex<EditorState>>>,
    app_handle: tauri::AppHandle,
) -> tauri::Result<()> {
    let mut state = state.lock().await;
    let doc = state.get_document(path.clone())?;

    doc.text.insert(data.from, &data.text);
    doc.changed = true;
    app_handle.emit("write_documents", path.clone())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_text(
    path: String,
    data: Delete,
    state: State<'_, Arc<Mutex<EditorState>>>,
    app_handle: tauri::AppHandle,
) -> tauri::Result<()> {
    let mut state = state.lock().await;
    let doc = state.get_document(path.clone())?;

    doc.text.remove(data.from..data.to);
    doc.changed = true;
    app_handle.emit("write_documents", path.clone())?;

    Ok(())
}
