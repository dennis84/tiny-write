use std::path::{Path, PathBuf};
use std::{env};
use std::io::{Error, ErrorKind};
use ignore::{WalkBuilder};
use globset::{Glob};

#[tauri::command]
pub fn list_contents(file: String) -> Vec<String> {
    let mut file = file;
    let mut files = Vec::new();

    // Convert input of "~/" to "/Users/me"
    if let Some(p) = expand_tilde(file.clone()) {
        if let Ok(p) = p.into_os_string().into_string() {
            file = p;
        }
    }

    // Get dirname of input to walk through: "~/Ca" -> "/Users/me"
    let dir = dirname(file.clone());
    if dir.is_err() {
        return files;
    }

    let mut dir = dir.unwrap();

    let resolved_dir = resolve_path(vec![dir.clone()]);
    if resolved_dir.is_ok() {
        dir = resolved_dir.unwrap();
    }

    let mut input = format!("{}**", file);
    if input.starts_with("./") {
        if let Ok(mut cur) = env::current_dir() {
            if let Some(p) = input.strip_prefix("./") {
                cur.push(p);
                input = cur.into_os_string().into_string().unwrap();
            }
        }
    }

    if let Some(p) = expand_tilde(&input) {
        if let Ok(i) = p.into_os_string().into_string() {
            input = i;
        }
    }

    let glob = Glob::new(&input);
    if glob.is_err() {
        return files;
    }

    println!("WALKKK: {:?}", dir);

    let glob = glob.unwrap().compile_matcher();
    let walker = WalkBuilder::new(dir)
        .max_depth(Some(3))
        .build();

    for entry in walker {
        match entry {
            Ok(path) => {
                if let Some(f) = path.into_path().into_os_string().to_str() {
                    if glob.is_match(f) && f != "./" {
                        let p = to_relative_path(f).unwrap_or(f.to_string());
                        files.push(p);
                    }
                }
            },
            Err(_) => {}
        }
    }

    files.truncate(10);
    files
}

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

    let path = path.unwrap();
    std::fs::canonicalize(&path)
        .and_then(|x| {
            x.into_os_string()
                .into_string()
                .map_err(|_| Error::new(ErrorKind::Other, "Could not convert os string to string"))
        })
        .map_err(|_| format!("File does not exist: {:?}", path))
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

fn path_buf_to_string(path: PathBuf) -> Result<String, Error> {
    path
        .into_os_string()
        .into_string()
        .map_err(|_| Error::new(ErrorKind::Other, "Could not convert path to string"))
}

fn to_relative_path<P: AsRef<Path>>(path: P) -> Result<String, Error> {
    let path = path.as_ref();
    let cur = env::current_dir()?;
    let cur = path_buf_to_string(cur)?;

    if path.starts_with(&cur) {
        if let Ok(p) = path.strip_prefix(&cur) {
            let p = path_buf_to_string(p.to_path_buf())?;
            return Ok(format!(".{}", p));
        }
    }

    let home = dirs::home_dir()
        .ok_or(Error::new(ErrorKind::Other, "Could not get home_dir"))?;
    let home = home
        .into_os_string()
        .into_string()
        .map_err(|_| Error::new(ErrorKind::Other, "Could not convert home_dir to string"))?;

    if path.starts_with(&home) {
        if let Ok(p) = path.strip_prefix(&home) {
            let p = path_buf_to_string(p.to_path_buf())?;
            return Ok(format!("~{}", p));
        }
    }

    path_buf_to_string(path.to_path_buf())
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

        assert_eq!(dirname("".to_string()).err().unwrap(), "No directory in: ");
    }

    #[test]
    fn test_list_contents() {
        assert_eq!(
            list_contents("./Ca".to_string()),
            vec!["./Cargo.toml", "./Cargo.lock"]
        );

        assert_eq!(
            list_contents("./src/m".to_string()),
            vec!["./src/main.rs"]
        );

        let test_file_path = format!("{}/tinywrite-test.txt", get_home());
        File::create(&test_file_path).unwrap();

        assert_eq!(
            list_contents("~/tinywrite".to_string()),
            vec!["~/tinywrite-test.txt"]
        );

        std::fs::remove_file(test_file_path).unwrap();

        assert_eq!(list_contents("".to_string()), Vec::<String>::new())
    }
}
