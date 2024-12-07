use crate::editor::pathutil::{self as pu};

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
pub fn to_relative_path(path: String, base_path: Option<String>) -> tauri::Result<String> {
    Ok(pu::to_relative_path(path, base_path).and_then(pu::path_buf_to_string)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::editor::testutil::get_home_as_string;

    #[test]
    fn test_to_relative_path() {
        let test_base_path = format!("{}/foo", get_home_as_string());
        let test_path = format!("{}/foo/bar", get_home_as_string());

        assert_eq!(
            to_relative_path(test_path.clone(), None).unwrap(),
            "~/foo/bar".to_string()
        );

        assert_eq!(
            to_relative_path(test_path.clone(), Some(test_base_path.clone())).unwrap(),
            "./bar".to_string()
        );

        assert_eq!(
            to_relative_path(test_base_path, Some(test_path)).unwrap(),
            "~/foo".to_string()
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
