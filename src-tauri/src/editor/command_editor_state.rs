use ropey::Rope;
use std::{sync::Arc, time::Duration};
use tauri::{path::SafePathBuf, Manager, Runtime};
use tokio::sync::Mutex;

use crate::{editor::editor_state::EditorState, lsp::service::LspService};

#[derive(Clone, Debug, serde::Deserialize)]
pub struct Insert {
    pub from: usize,
    pub to: usize,
    pub text: String,
}

#[derive(Clone, Debug, serde::Deserialize)]
pub struct Delete {
    pub from: usize,
    pub to: usize,
}

#[tauri::command]
pub async fn read_text<R: Runtime>(
    path: SafePathBuf,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<String> {
    let state = app_handle.state::<Arc<Mutex<EditorState>>>();
    let mut state = state.lock().await;
    let doc = state.load_document(path.as_ref())?;
    Ok(doc.text.to_string())
}

#[tauri::command]
pub async fn write_text<R: Runtime>(
    path: SafePathBuf,
    data: String,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<()> {
    let state = app_handle.state::<Arc<Mutex<EditorState>>>();
    let mut state = state.lock().await;
    let doc = state.get_document(path.as_ref())?;

    doc.text = Rope::from_str(&data);
    doc.changed = true;
    doc.version += 1;

    state.debounced_write_tx.send(path.as_ref().to_path_buf(), Duration::from_millis(3000))?;

    Ok(())
}

#[tauri::command]
pub async fn insert_text<R: Runtime>(
    path: SafePathBuf,
    data: Insert,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<()> {
    let state = app_handle.state::<Arc<Mutex<EditorState>>>();
    let mut state = state.lock().await;
    let doc = state.get_document(path.as_ref())?;

    let from = doc.text.utf16_cu_to_char(data.from);

    doc.text.insert(from, &data.text);
    doc.changed = true;
    doc.version += 1;

    let lsp_service = app_handle.state::<Arc<LspService<R>>>();
    lsp_service.insert_document(doc, &data).await?;

    state.debounced_write_tx.send(path.as_ref().to_path_buf(), Duration::from_millis(3000))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_text<R: Runtime>(
    path: SafePathBuf,
    data: Delete,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<()> {
    let state = app_handle.state::<Arc<Mutex<EditorState>>>();
    let mut state = state.lock().await;
    let doc = state.get_document(path.as_ref())?;

    let from = doc.text.utf16_cu_to_char(data.from);
    let to = doc.text.utf16_cu_to_char(data.to);

    doc.text.remove(from..to);
    doc.changed = true;
    doc.version += 1;

    let lsp_service = app_handle.state::<Arc<LspService<R>>>();
    lsp_service.delete_document(doc, &data).await?;

    state.debounced_write_tx.send(path.as_ref().to_path_buf(), Duration::from_millis(3000))?;

    Ok(())
}
