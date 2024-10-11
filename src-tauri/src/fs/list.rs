use crate::editor::pathutil::{self as pu};
use anyhow::anyhow;
use globset::Glob;
use ignore::WalkBuilder;
use log::info;
use std::path::PathBuf;

#[tauri::command]
pub fn list_contents(path: String, base_path: Option<String>) -> tauri::Result<Vec<String>> {
    let path = PathBuf::from(&path);
    let base_path = base_path.map(PathBuf::from);
    let mut files = Vec::new();

    // ./my/filena -> /users/me/my/filena
    let path = pu::to_absolute_path(path, base_path.clone())?;
    // get dir: /users/me/my/filena -> /users/me/my
    let dir = pu::dirname(&path)?;
    let dir = std::fs::canonicalize(dir)?;

    let mut glob_pattern = dir.clone();

    if path.is_dir() {
        glob_pattern.push("*");
    } else if let Some(name) = path.file_name() {
        glob_pattern.push(format!("{}*", name.to_str().unwrap_or("")));
    }

    let glob_pattern = pu::path_buf_to_string(glob_pattern)?;
    info!("List files by glob fliter {}", glob_pattern);

    let glob = Glob::new(&glob_pattern).map_err(|e| anyhow!(e.to_string()))?;
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

#[cfg(test)]
mod tests {
    use serial_test::serial;

    use super::*;

    use crate::editor::testutil::{create_test_workspace, get_home_as_string};

    #[test]
    #[serial]
    fn test_list_contents() {
        create_test_workspace();

        assert_eq!(
            list_contents("./Ca".to_string(), None).unwrap(),
            vec!["./Cargo.lock", "./Cargo.toml"]
        );

        assert_eq!(
            list_contents("./src/m".to_string(), None).unwrap(),
            vec!["./src/main.rs", "./src/menu"]
        );

        assert_eq!(
            list_contents("~/tinyw".to_string(), None).unwrap(),
            vec!["~/tinywrite"]
        );

        assert_eq!(
            list_contents("~/tinywrite/".to_string(), None).unwrap(),
            vec!["~/tinywrite/README.md", "~/tinywrite/src"]
        );

        assert_eq!(
            list_contents("./tinyw".to_string(), Some(get_home_as_string())).unwrap(),
            vec!["./tinywrite"]
        );

        assert_eq!(
            list_contents("./tinywrite/".to_string(), Some(get_home_as_string())).unwrap(),
            vec!["./tinywrite/README.md", "./tinywrite/src"]
        );

        assert!(!list_contents("~/".to_string(), None).unwrap().is_empty());

        assert!(!list_contents("./icons/".to_string(), None)
            .unwrap()
            .is_empty());

        assert!(!list_contents("".to_string(), None).unwrap().is_empty());
    }
}
