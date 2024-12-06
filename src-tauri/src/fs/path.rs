use std::path::PathBuf;

use tauri::{Manager, Runtime};

use crate::editor::{
    editor_state::EditorState,
    pathutil::{self as pu},
};

#[tauri::command]
pub fn dirname(path: String) -> tauri::Result<String> {
    Ok(pu::dirname(path).and_then(pu::path_buf_to_string)?)
}

#[tauri::command]
pub fn resolve_path(path: String, base_path: Option<String>) -> tauri::Result<String> {
    Ok(pu::resolve_path(path, base_path).and_then(pu::path_buf_to_string)?)
}

#[tauri::command]
pub fn to_absolute_path(path: String, base_path: Option<String>) -> tauri::Result<String> {
    Ok(pu::to_absolute_path(path, base_path).and_then(pu::path_buf_to_string)?)
}

#[tauri::command]
pub async fn to_relative_path<R: Runtime>(
    path: PathBuf,
    base_path: Option<PathBuf>,
    app_handle: tauri::AppHandle<R>,
) -> tauri::Result<String> {
    let state = app_handle.state::<EditorState>();
    let doc = state.get_document(path.as_ref()).await?;
    let bp = doc.worktree_path.or(base_path);
    let relative_path = pu::to_relative_path(path, bp).and_then(pu::path_buf_to_string)?;
    Ok(relative_path)
}

#[cfg(test)]
mod tests {
    use tauri::test::mock_app;
    use serial_test::serial;

    use super::*;

    use crate::editor::testutil::{create_test_workspace, get_home_as_string, get_test_dir};

    #[tokio::test]
    #[serial]
    async fn test_to_relative_path() {
        create_test_workspace(true);

        let test_base_path = get_test_dir().join("src");
        let test_path = test_base_path.join("index.rs");

        let editor_state = EditorState::new();
        let app = mock_app();
        app.manage(editor_state);
        let handle = app.app_handle();

        assert_eq!(
            to_relative_path(test_path.clone(), None, handle.clone())
                .await
                .unwrap(),
            "./src/index.rs".to_string()
        );

        assert_eq!(
            to_relative_path(
                test_path.clone(),
                Some(test_base_path.clone()),
                handle.clone()
            )
            .await
            .unwrap(),
            "./src/index.rs".to_string()
        );

        // Without project workspace

        create_test_workspace(false);

        let editor_state = EditorState::new();
        let app = mock_app();
        app.manage(editor_state);
        let handle = app.app_handle();

        assert_eq!(
            to_relative_path(
                test_path.clone(),
                Some(test_base_path.clone()),
                handle.clone()
            )
            .await
            .unwrap(),
            "./index.rs".to_string()
        );

        assert_eq!(
            to_relative_path(test_path, None, handle.clone())
                .await
                .unwrap(),
            "~/tinywrite/src/index.rs".to_string()
        );
    }

    #[test]
    fn test_to_absolute_path() {
        let test_base_path = format!("{}/foo", get_home_as_string());

        assert_eq!(
            to_absolute_path("~/foo/bar".to_string(), None).unwrap(),
            format!("{}/foo/bar", get_home_as_string()).to_string()
        );

        assert_eq!(
            to_absolute_path("~/../foo/bar".to_string(), None).unwrap(),
            format!("{}/../foo/bar", get_home_as_string()).to_string()
        );

        assert_eq!(
            to_absolute_path("./foo/bar".to_string(), Some(test_base_path)).unwrap(),
            format!("{}/foo/foo/bar", get_home_as_string()).to_string()
        );

        assert_eq!(
            to_absolute_path("./foo/bar".to_string(), Some("/".to_string())).unwrap(),
            "/foo/bar".to_string()
        );
    }
}
