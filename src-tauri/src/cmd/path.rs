use crate::pathutil as pu;
use globset::Glob;
use ignore::WalkBuilder;
use log::info;
use std::path::PathBuf;

#[tauri::command]
pub fn list_contents(file: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    let file = pu::expand_tilde(file).ok_or("Fail")?;
    let dir = pu::dirname(&file).map_err(|e| e.to_string())?;

    let mut glob_pattern = dir.clone();
    let file_name = PathBuf::from(&file);
    if let Some(name) = file_name.file_name() {
        if !file_name.is_dir() {
            glob_pattern.push(name);
        }
    }
    let glob_pattern = pu::path_buf_to_string(glob_pattern).map_err(|e| e.to_string())?;
    let glob_pattern = format!("{}**", glob_pattern);

    info!(
        "List file contents in {} and glob fliter by {}",
        pu::path_buf_to_string(&dir).unwrap_or("".into()),
        glob_pattern
    );

    let glob = Glob::new(&glob_pattern).map_err(|e| e.to_string())?;
    let glob = glob.compile_matcher();
    let walker = WalkBuilder::new(dir).max_depth(Some(3)).build();

    for entry in walker {
        match entry {
            Ok(path) => {
                let path = path.into_path();
                if glob.is_match(&path) {
                    let relative_path =
                        pu::to_relative_path(&path).and_then(|p| pu::path_buf_to_string(p));
                    if let Ok(p) = relative_path {
                        files.push(p);
                    }
                }
            }
            Err(_) => {}
        }
    }

    files.truncate(10);
    Ok(files)
}

#[tauri::command]
pub fn dirname(p: String) -> Result<String, String> {
    pu::dirname(p)
        .and_then(|p| pu::path_buf_to_string(p))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resolve_path(paths: Vec<String>) -> Result<String, String> {
    pu::resolve_path(paths)
        .and_then(|p| pu::path_buf_to_string(p))
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
        assert_eq!(
            list_contents("./Ca".to_string()).unwrap(),
            vec!["./Cargo.toml", "./Cargo.lock"]
        );

        assert_eq!(
            list_contents("./src/m".to_string()).unwrap(),
            vec!["./src/main.rs"]
        );

        let test_file_path = format!("{}/tinywrite-test.txt", get_home());
        File::create(&test_file_path).unwrap();

        assert_eq!(
            list_contents("~/tinywrite".to_string()).unwrap(),
            vec!["~/tinywrite-test.txt"]
        );

        assert!(list_contents("~/".to_string()).unwrap().len() > 0);

        std::fs::remove_file(test_file_path).unwrap();

        assert!(list_contents("./icons/".to_string()).unwrap().len() > 0);
        assert!(list_contents("~/Downloads/".to_string()).unwrap().len() > 0);

        assert_eq!(list_contents("".to_string()).unwrap_err(), "No parent dir");
    }
}
