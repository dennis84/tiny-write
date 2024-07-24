use crate::pathutil::{self as pu};
use anyhow::Result;
use globset::Glob;
use ignore::WalkBuilder;
use log::info;
use std::path::PathBuf;

#[tauri::command]
pub fn list_contents(path: String, base_path: Option<String>) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&path);
    let base_path = base_path.map(PathBuf::from);
    let mut files = Vec::new();

    // ./my/filena -> /users/me/my/filena
    let path = pu::to_absolute_path(path, base_path.clone()).map_err(|e| e.to_string())?;
    // get dir: /users/me/my/filena -> /users/me/my
    let dir = pu::dirname(&path).map_err(|e| e.to_string())?;
    let dir = std::fs::canonicalize(dir).map_err(|e| e.to_string())?;

    let mut glob_pattern = dir.clone();

    if path.is_dir() {
        glob_pattern.push("*");
    } else if let Some(name) = path.file_name() {
        glob_pattern.push(format!("{}*", name.to_str().unwrap_or("")));
    }

    let glob_pattern = pu::path_buf_to_string(glob_pattern).map_err(|e| e.to_string())?;
    info!("List files by glob fliter {}", glob_pattern);

    let glob = Glob::new(&glob_pattern).map_err(|e| e.to_string())?;
    let glob = glob.compile_matcher();
    let walker = WalkBuilder::new(dir).max_depth(Some(1)).build();

    for path in walker.flatten() {
        let path = path.into_path();
        if glob.is_match(&path) {
            let relative_path =
                pu::to_relative_path(path, base_path.clone()).and_then(pu::path_buf_to_string);
            if let Ok(p) = relative_path {
                files.push(p);
            }
        }
    }

    files.truncate(10);
    files.sort();
    Ok(files)
}

#[tauri::command]
pub fn dirname(path: String) -> Result<String, String> {
    pu::dirname(path)
        .and_then(pu::path_buf_to_string)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resolve_path(path: String, base_path: Option<String>) -> Result<String, String> {
    pu::resolve_path(path, base_path)
        .and_then(pu::path_buf_to_string)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn to_relative_path(path: String, base_path: Option<String>) -> Result<String, String> {
    pu::to_relative_path(path, base_path)
        .and_then(pu::path_buf_to_string)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;

    fn get_home() -> String {
        dirs::home_dir()
            .unwrap()
            .into_os_string()
            .into_string()
            .unwrap()
    }

    #[test]
    fn test_list_contents() {
        std::fs::create_dir(format!("{}/tinywrite", get_home())).ok();
        File::create(format!("{}/tinywrite/test.txt", get_home())).ok();

        assert_eq!(
            list_contents("./Ca".to_string(), None).unwrap(),
            vec!["./Cargo.lock", "./Cargo.toml"]
        );

        assert_eq!(
            list_contents("./src/m".to_string(), None).unwrap(),
            vec!["./src/main.rs", "./src/menu.rs"]
        );

        assert_eq!(
            list_contents("~/tinyw".to_string(), None).unwrap(),
            vec!["~/tinywrite"]
        );

        assert_eq!(
            list_contents("~/tinywrite/".to_string(), None).unwrap(),
            vec!["~/tinywrite/test.txt"]
        );

        assert_eq!(
            list_contents("./tinyw".to_string(), Some(get_home())).unwrap(),
            vec!["./tinywrite"]
        );

        assert_eq!(
            list_contents("./tinywrite/".to_string(), Some(get_home())).unwrap(),
            vec!["./tinywrite/test.txt"]
        );

        assert!(!list_contents("~/".to_string(), None).unwrap().is_empty());

        assert!(!list_contents("./icons/".to_string(), None)
            .unwrap()
            .is_empty());

        assert!(!list_contents("".to_string(), None).unwrap().is_empty());

        std::fs::remove_dir_all(format!("{}/tinywrite", get_home())).ok();
    }

    #[test]
    fn test_to_relative_path() {
        let test_base_path = format!("{}/foo", get_home());
        let test_path = format!("{}/foo/bar", get_home());

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
}
