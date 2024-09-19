use std::sync::Arc;
use ropey::Rope;
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
pub async fn rope_from_string(
    path: String,
    data: String,
    state: State<'_, Arc<Mutex<EditorState>>>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    from_string(path, data, state, app_handle)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rope_insert(
    path: String,
    data: Insert,
    state: State<'_, Arc<Mutex<EditorState>>>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    insert(path, data, state, app_handle)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rope_delete(
    path: String,
    data: Delete,
    state: State<'_, Arc<Mutex<EditorState>>>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    delete(path, data, state, app_handle)
        .await
        .map_err(|e| e.to_string())
}

async fn from_string(
    path: String,
    data: String,
    state: State<'_, Arc<Mutex<EditorState>>>,
    app_handle: tauri::AppHandle,
) -> anyhow::Result<()> {
    let mut state = state.lock().await;
    let doc = state.get_document(path.clone())?;

    doc.text = Rope::from_str(&data);
    doc.changed = true;
    app_handle.emit("write_documents", path.clone())?;

    Ok(())
}

async fn insert(
    path: String,
    data: Insert,
    state: State<'_, Arc<Mutex<EditorState>>>,
    app_handle: tauri::AppHandle,
) -> anyhow::Result<()> {
    let mut state = state.lock().await;
    let doc = state.get_document(path.clone())?;

    doc.text.insert(data.from, &data.text);
    doc.changed = true;
    app_handle.emit("write_documents", path.clone())?;

    Ok(())
}

async fn delete(
    path: String,
    data: Delete,
    state: State<'_, Arc<Mutex<EditorState>>>,
    app_handle: tauri::AppHandle,
) -> anyhow::Result<()> {
    let mut state = state.lock().await;
    let doc = state.get_document(path.clone())?;

    doc.text.remove(data.from..data.to);
    doc.changed = true;
    app_handle.emit("write_documents", path.clone())?;

    Ok(())
}
