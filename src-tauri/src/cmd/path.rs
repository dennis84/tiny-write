use std::path::{Path, PathBuf};
use std::env;
use std::io::{Error, ErrorKind};

#[tauri::command]
pub fn dirname(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if p.is_dir() {
        return Ok(path);
    }

    let mut ancestors = p.ancestors();
    ancestors.next().ok_or(format!("No directory in: {}", path))?;
    let d = ancestors.next().ok_or(format!("No directory in: {}", path))?;
    d.to_path_buf()
        .into_os_string()
        .into_string()
        .map_err(|_| "".to_string())
}

#[tauri::command]
pub fn resolve_path(paths: Vec<String>) -> Result<String, String> {
    let mut path = env::current_dir().ok();

    for p in paths {
        match expand_tilde(p) {
            Some(path_buf) => {
                if path_buf.is_absolute() {
                    path = Some(path_buf);
                    continue;
                }

                if let Some(ref prev) = path {
                    path = Some(prev.join(path_buf));
                }
            }
            None => return Err("Error in expand_tilde".into()),
        }
    }

    std::fs::canonicalize(path.unwrap())
        .and_then(|x| {
            x.into_os_string()
                .into_string()
                .map_err(|_| Error::new(ErrorKind::Other, "Could not convert os string to string"))
        })
        .map_err(|_| "File does not exist".into())
}

fn expand_tilde<P: AsRef<Path>>(path_user_input: P) -> Option<PathBuf> {
    let p = path_user_input.as_ref();
    if !p.starts_with("~") {
        return Some(p.to_path_buf());
    }
    if p == Path::new("~") {
        return dirs::home_dir();
    }
    dirs::home_dir().map(|mut h| {
        if h == Path::new("/") {
            // Corner case: `h` root directory;
            // don't prepend extra `/`, just drop the tilde.
            p.strip_prefix("~").unwrap().to_path_buf()
        } else {
            h.push(p.strip_prefix("~/").unwrap());
            h
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;

    #[test]
    fn test_resolve_path() {
        let home = dirs::home_dir()
            .unwrap()
            .into_os_string()
            .into_string()
            .unwrap();

        let test_file_path = format!("{}/.tinywrite-test.txt", &home);
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
            resolve_path(vec![home.clone(), "./.tinywrite-test.txt".to_string()]).unwrap(),
            test_file_path,
        );

        assert_eq!(
            resolve_path(vec![home.clone(), format!("{}/.tinywrite-test.txt", home.clone())]).unwrap(),
            format!("{}/.tinywrite-test.txt", home.clone())
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

        assert_eq!(dirname("".to_string()).err().unwrap(), "No directory in: ");
    }
}
