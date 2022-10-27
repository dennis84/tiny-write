use std::path::{Path, PathBuf};
use std::{env};
use std::io::{Error, ErrorKind};
use log::{info};
use ignore::{WalkBuilder};
use globset::{Glob};

#[tauri::command]
pub fn list_contents(file: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();

    // Get dirname of input to walk through:
    // ~/Ca -> /Users/me
    // ./Ca -> ./Ca
    let dir = dirname(file.clone())
        .map_err(|e| e.to_string())?;
    // Resolve maybe relative dir to absolute
    let dir = resolve_path(vec![dir.clone()])?;

    // Convert input to absolute path
    let mut input = PathBuf::from(&dir);
    let file_name = PathBuf::from(&file);
    if let Some(file_name) = file_name.file_name() {
        input.push(file_name);
    }
    let input = path_buf_to_string(input)
        .map_err(|e| e.to_string())?;
    let input = format!("{}**", input);

    info!("List file contents in {} and glob fliter by {}", dir, input);
    let glob = Glob::new(&input)
        .map_err(|e| e.to_string())?;
    let glob = glob.compile_matcher();
    let walker = WalkBuilder::new(dir)
        .max_depth(Some(3))
        .build();

    for entry in walker {
        match entry {
            Ok(path) => {
                let path = path.into_path();
                if glob.is_match(&path) {
                    let relative_path = to_relative_path(&path)
                        .and_then(|p| path_buf_to_string(p));
                    if let Ok(p) = relative_path {
                        files.push(p);
                    }
                }
            },
            Err(_) => {}
        }
    }

    files.truncate(10);
    Ok(files)
}

#[tauri::command]
pub fn dirname(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    let p = expand_tilde(&p).unwrap_or(p);

    if p.is_dir() {
        return path_buf_to_string(p).map_err(|e| e.to_string());
    }

    let mut ancestors = p.ancestors();
    ancestors.next().ok_or(format!("No directory in: {}", path))?;
    let d = ancestors.next().ok_or(format!("No directory in: {}", path))?;
    path_buf_to_string(d.to_path_buf())
        .map_err(|_| "".to_string())
}

#[tauri::command]
pub fn resolve_path(paths: Vec<String>) -> Result<String, String> {
    let mut path = env::current_dir()
        .map_err(|e| e.to_string())?;

    for p in paths {
        match expand_tilde(p) {
            Some(path_buf) => {
                if path_buf.is_absolute() {
                    path = path_buf;
                    continue;
                }

                path = path.join(path_buf);
            }
            None => return Err("Error in expand_tilde".into()),
        }
    }

    std::fs::canonicalize(&path)
        .and_then(|x| path_buf_to_string(x))
        .map_err(|_| format!("File does not exist: {:?}", path))
}

fn expand_tilde<P: AsRef<Path>>(path_user_input: P) -> Option<PathBuf> {
    let p = path_user_input.as_ref();
    if !p.starts_with("~") {
        return Some(p.to_path_buf());
    }

    let mut home_dir = dirs::home_dir()?;
    if p == Path::new("~") {
        return Some(home_dir);
    }

    if home_dir == Path::new("/") {
        // Corner case: `h` root directory;
        // don't prepend extra `/`, just drop the tilde.
        Some(p.strip_prefix("~").ok()?.to_path_buf())
    } else {
        home_dir.push(p.strip_prefix("~/").unwrap());
        Some(home_dir)
    }
}

fn path_buf_to_string(path: PathBuf) -> Result<String, Error> {
    path
        .into_os_string()
        .into_string()
        .map_err(|_| Error::new(ErrorKind::Other, "Could not convert path to string"))
}

fn to_relative_path<P: AsRef<Path>>(path: P) -> Result<PathBuf, Error> {
    let path = path.as_ref();
    let cur = env::current_dir()?;
    let cur = path_buf_to_string(cur)?;

    if path.starts_with(&cur) {
        if let Ok(p) = path.strip_prefix(&cur) {
            return Ok(Path::new(".").join(p));
        }
    }

    let home = dirs::home_dir()
        .ok_or(Error::new(ErrorKind::Other, "Could not get home_dir"))?
        .into_os_string()
        .into_string()
        .map_err(|_| Error::new(ErrorKind::Other, "Could not convert home_dir to string"))?;

    if path.starts_with(&home) {
        if let Ok(p) = path.strip_prefix(&home) {
            // let p = path_buf_to_string(p.to_path_buf())?;
            return Ok(Path::new("~").join(p));
        }
    }

    Ok(path.to_path_buf())
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
    fn test_resolve_path() {
        let test_file_path = format!("{}/.tinywrite-test.txt", get_home());
        File::create(&test_file_path).unwrap();

        let cur = env::current_dir()
            .unwrap()
            .into_os_string()
            .into_string()
            .unwrap();

        assert_eq!(
            resolve_path(vec!["~/.tinywrite-test.txt".to_string()]).unwrap(),
            test_file_path,
        );

        assert_eq!(
            resolve_path(vec![get_home(), "./.tinywrite-test.txt".to_string()]).unwrap(),
            test_file_path,
        );

        assert_eq!(
            resolve_path(vec![get_home(), format!("{}/.tinywrite-test.txt", get_home())]).unwrap(),
            format!("{}/.tinywrite-test.txt", get_home())
        );

        assert_eq!(
            resolve_path(vec!["./Cargo.toml".to_string()]).unwrap(),
            format!("{}/Cargo.toml", cur),
        );

        std::fs::remove_file(test_file_path).unwrap();
    }

    #[test]
    fn test_dirname() {
        assert_eq!(
            dirname("../src-tauri/Cargo.lock".to_string()).unwrap(),
            "../src-tauri".to_string()
        );

        assert_eq!(
            dirname("../src-tauri".to_string()).unwrap(),
            "../src-tauri".to_string()
        );

        assert_eq!(
            dirname("./Cargo.lock".to_string()).unwrap(),
            ".".to_string()
        );

        assert_eq!(dirname("Cargo.lock".to_string()).unwrap(), "".to_string());

        assert_eq!(dirname("".to_string()).unwrap_err(), "No directory in: ");

        assert_eq!(
            dirname("~/src-tauri/Cargo.lock".to_string()).unwrap(),
            format!("{}/src-tauri", get_home())
        );

        assert_eq!(dirname("~/".to_string()).unwrap(), get_home());
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

        std::fs::remove_file(test_file_path).unwrap();

        assert_eq!(list_contents("".to_string()).unwrap_err(), "No directory in: ");
    }
}
