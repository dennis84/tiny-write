use std::env;
use std::ffi::OsStr;
use std::io::{Error, ErrorKind};
use std::path::{Path, PathBuf};

pub fn resolve_path<P: AsRef<Path>>(paths: Vec<P>) -> Result<PathBuf, Error> {
    let mut path = env::current_dir()?;

    for p in paths {
        match expand_tilde(p) {
            Some(path_buf) => {
                if path_buf.is_absolute() {
                    path = path_buf;
                    continue;
                }

                path = path.join(path_buf);
            }
            None => return Err(Error::new(ErrorKind::Other, "Error in expand_tilde")),
        }
    }

    std::fs::canonicalize(&path)
}

pub fn dirname<P: AsRef<Path>>(p: P) -> Result<PathBuf, Error> {
    let p = p.as_ref().to_path_buf();
    let p = expand_tilde(&p).unwrap_or(p);

    if p.is_dir() {
        return Ok(p);
    }

    let mut ancestors = p.ancestors();
    ancestors
        .next()
        .ok_or(Error::new(ErrorKind::Other, "No parent dir"))?;

    Ok(ancestors
        .next()
        .ok_or(Error::new(ErrorKind::Other, "No parent dir"))?
        .to_path_buf())
}

pub fn expand_tilde<P: AsRef<Path>>(path_user_input: P) -> Option<PathBuf> {
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

pub fn path_buf_to_string<P: AsRef<OsStr>>(path: P) -> Result<String, Error> {
    path.as_ref()
        .to_os_string()
        .into_string()
        .map_err(|_| Error::new(ErrorKind::Other, "Could not convert path to string"))
}

pub fn to_relative_path<P: AsRef<Path>>(path: P) -> Result<PathBuf, Error> {
    let path = path.as_ref();
    let cur = env::current_dir()?;
    let cur = path_buf_to_string(cur)?;

    if path.starts_with(&cur) {
        if let Ok(p) = path.strip_prefix(&cur) {
            return Ok(Path::new(".").join(p));
        }
    }

    let home = dirs::home_dir().ok_or(Error::new(ErrorKind::Other, "Could not get home_dir"))?;
    let home = path_buf_to_string(home)?;

    if path.starts_with(&home) {
        if let Ok(p) = path.strip_prefix(&home) {
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
            resolve_path(vec!["~/.tinywrite-test.txt"]).unwrap(),
            PathBuf::from(&test_file_path),
        );

        assert_eq!(
            resolve_path(vec![get_home().as_ref(), "./.tinywrite-test.txt"]).unwrap(),
            PathBuf::from(&test_file_path),
        );

        assert_eq!(
            resolve_path(vec![
                get_home(),
                format!("{}/.tinywrite-test.txt", get_home())
            ])
            .unwrap(),
            PathBuf::from(format!("{}/.tinywrite-test.txt", get_home()))
        );

        assert_eq!(
            resolve_path(vec!["./Cargo.toml"]).unwrap(),
            PathBuf::from(format!("{}/Cargo.toml", cur)),
        );

        std::fs::remove_file(test_file_path).unwrap();
    }

    #[test]
    fn test_dirname() {
        assert_eq!(
            dirname("../src-tauri/Cargo.lock").unwrap(),
            PathBuf::from("../src-tauri")
        );

        assert_eq!(
            dirname("../src-tauri").unwrap(),
            PathBuf::from("../src-tauri")
        );

        assert_eq!(dirname("./Cargo.lock").unwrap(), PathBuf::from("."));

        assert_eq!(dirname("Cargo.lock").unwrap(), PathBuf::from(""));

        assert!(dirname("").is_err());

        assert_eq!(
            dirname("~/src-tauri/Cargo.lock").unwrap(),
            PathBuf::from(format!("{}/src-tauri", get_home()))
        );

        assert_eq!(dirname("~/").unwrap(), PathBuf::from(get_home()));
    }
}
