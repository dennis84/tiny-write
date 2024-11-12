use tauri::{path::SafePathBuf, Manager, Runtime};

use crate::{editor::editor_state::EditorState, lsp::service::LspService};

use super::editor_state::{Delete, Insert};

#[tauri::command]
pub async fn read_text<R: Runtime>(
    path: SafePathBuf,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<String> {
    let state = app_handle.state::<EditorState>();
    let doc = state.get_document(path.as_ref()).await?;
    let text = doc.text.to_string();
    Ok(text)
}

#[tauri::command]
pub async fn replace_text<R: Runtime>(
    path: SafePathBuf,
    data: String,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<()> {
    let state = app_handle.state::<EditorState>();
    state.replace_text(path.as_ref(), &data)?;

    Ok(())
}

#[tauri::command]
pub async fn insert_text<R: Runtime>(
    path: SafePathBuf,
    data: Insert,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<()> {
    let state = app_handle.state::<EditorState>();

    state.insert_text(path.as_ref(), &data)?;

    let doc = state.get_document(path.as_ref()).await?;
    let lsp_service = app_handle.state::<LspService<R>>();
    let _ = lsp_service.insert_document(&doc, &data).await;

    Ok(())
}

#[tauri::command]
pub async fn delete_text<R: Runtime>(
    path: SafePathBuf,
    data: Delete,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<()> {
    let state = app_handle.state::<EditorState>();

    let doc = state.get_document(path.as_ref()).await?;
    let lsp_service = app_handle.state::<LspService<R>>();
    let _ = lsp_service.delete_document(&doc, &data).await;

    state.delete_text(path.as_ref(), &data)?;

    Ok(())
}

#[tauri::command]
pub async fn write_file<R: Runtime>(
    path: SafePathBuf,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<()> {
    let state = app_handle.state::<EditorState>();
    state.write_document(path.as_ref())?;
    Ok(())
}
