use tauri::{path::SafePathBuf, Manager, Runtime};

use crate::{
    copilot::service::CopilotService,
    editor::editor_state::{Document, EditorState},
    lsp::service::LspService,
};

use super::editor_state::{Delete, Insert, UpdateDocument};

#[tauri::command]
pub async fn get_document<R: Runtime>(
    path: SafePathBuf,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<Document> {
    let state = app_handle.state::<EditorState>();
    let doc = state.get_document(path.as_ref()).await?;
    Ok(doc)
}

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
    data: UpdateDocument,
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

    if let Some(language_server_id) = doc.get_language_server_id() {
        let _ = lsp_service
            .insert_document(&language_server_id, &doc, &data)
            .await;
    }

    let copilot_service = app_handle.state::<CopilotService<R>>();
    let _ = copilot_service.insert_document(&doc, &data).await;

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
    if let Some(language_server_id) = doc.get_language_server_id() {
        let _ = lsp_service
            .delete_document(&language_server_id, &doc, &data)
            .await;
    }

    let copilot_service = app_handle.state::<CopilotService<R>>();
    let _ = copilot_service.delete_document(&doc, &data).await;

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
