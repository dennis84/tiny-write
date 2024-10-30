use std::{sync::Arc, time::Duration};
use tauri::{path::SafePathBuf, Manager, Runtime};
use tokio::sync::Mutex;

use crate::{editor::editor_state::EditorState, lsp::service::LspService};

use super::editor_state::{Delete, Insert};

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

    state.replace_text(path.as_ref(), &data)?;
    state
        .debounced_write_tx
        .send(path.as_ref().to_path_buf(), Duration::from_millis(3000))?;

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

    state.insert_text(path.as_ref(), &data)?;

    let doc = state.get_document(path.as_ref())?;
    let lsp_service = app_handle.state::<Arc<LspService<R>>>();
    lsp_service.insert_document(doc, &data).await?;

    state
        .debounced_write_tx
        .send(path.as_ref().to_path_buf(), Duration::from_millis(3000))?;

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

    state.delete_text(path.as_ref(), &data)?;

    let doc = state.get_document(path.as_ref())?;
    let lsp_service = app_handle.state::<Arc<LspService<R>>>();
    lsp_service.delete_document(doc, &data).await?;

    state
        .debounced_write_tx
        .send(path.as_ref().to_path_buf(), Duration::from_millis(3000))?;

    Ok(())
}
