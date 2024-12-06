use anyhow::{anyhow, Result};
use std::env::{self, temp_dir};
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};

pub fn to_absolute_path<P: AsRef<Path>>(path: P, base_path: Option<P>) -> Result<PathBuf> {
    let path = path.as_ref().to_path_buf();
    let mut path = expand_tilde(&path).unwrap_or(path);
    if path.starts_with("./") {
        path = path.strip_prefix(".")?.to_path_buf();
    }

    let cur = env::current_dir()?;
    let base_path = base_path.map(|p| p.as_ref().to_path_buf()).unwrap_or(cur);

    let path = base_path.join(path);
    Ok(path)
}

pub fn resolve_path<P: AsRef<Path>>(path: P, base_path: Option<P>) -> Result<PathBuf> {
    let path = to_absolute_path(path, base_path)?;
    let path = std::fs::canonicalize(path)?;
    Ok(path)
}

pub fn dirname<P: AsRef<Path>>(p: P) -> Result<PathBuf> {
    let p = p.as_ref().to_path_buf();
    let p = expand_tilde(&p).unwrap_or(p);

    if p.is_dir() {
        return Ok(p);
    }

    let p = p.parent().ok_or(anyhow!("No parent dir"))?.to_path_buf();
    Ok(p)
}

pub fn expand_tilde<P: AsRef<Path>>(path_user_input: P) -> Option<PathBuf> {
    let p = path_user_input.as_ref();
    if !p.starts_with("~") {
        return Some(p.to_path_buf());
    }

    let mut home = home_dir()?;
    if p == Path::new("~") {
        return Some(home);
    }

    if home == Path::new("/") {
        // Corner case: `h` root directory;
        // don't prepend extra `/`, just drop the tilde.
        Some(p.strip_prefix("~").ok()?.to_path_buf())
    } else {
        home.push(p.strip_prefix("~/").unwrap());
        Some(home)
    }
}

pub fn path_buf_to_string<P: AsRef<OsStr>>(path: P) -> Result<String> {
    path.as_ref()
        .to_os_string()
        .into_string()
        .map_err(|_| anyhow!("Could not convert path to string"))
}

pub fn to_relative_path<P: AsRef<Path>>(path: P, base_path: Option<P>) -> Result<PathBuf> {
    let path = path.as_ref();
    let cur = env::current_dir()?;
    let cur = base_path.map(|p| p.as_ref().to_path_buf()).unwrap_or(cur);
    let cur = path_buf_to_string(cur)?;

    if path.starts_with(&cur) {
        if let Ok(p) = path.strip_prefix(&cur) {
            return Ok(Path::new(".").join(p));
        }
    }

    let home = home_dir().ok_or(anyhow!("Could not get home_dir"))?;
    let home = path_buf_to_string(home)?;

    if path.starts_with(&home) {
        if let Ok(p) = path.strip_prefix(&home) {
            return Ok(Path::new("~").join(p));
        }
    }

    Ok(path.to_path_buf())
}

pub fn home_dir() -> Option<PathBuf> {
    if cfg!(test) {
        let home = temp_dir().join("tw-home");
        fs::create_dir_all(&home).unwrap();
        fs::canonicalize(home).ok()
    } else {
        dirs::home_dir()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;

    fn get_home() -> String {
        home_dir().unwrap().into_os_string().into_string().unwrap()
    }

    #[test]
    fn test_resolve_path() {
        let test_file_path = PathBuf::from(format!("{}/.tinywrite-test.txt", get_home()));
        File::create(&test_file_path).unwrap();

        let cur = env::current_dir()
            .unwrap()
            .into_os_string()
            .into_string()
            .unwrap();

        assert_eq!(
            resolve_path("~/.tinywrite-test.txt", None).unwrap(),
            test_file_path,
        );

        assert_eq!(
            resolve_path("./.tinywrite-test.txt", Some(&get_home())).unwrap(),
            test_file_path,
        );

        assert_eq!(
            resolve_path(
                format!("{}/.tinywrite-test.txt", get_home()),
                Some(get_home())
            )
            .unwrap(),
            test_file_path
        );

        assert_eq!(
            resolve_path("./Cargo.toml", None).unwrap(),
            PathBuf::from(format!("{}/Cargo.toml", cur)),
        );

        // removes last slash ./ -> /users/me
        assert_eq!(
            resolve_path("./", Some(&get_home())).unwrap(),
            PathBuf::from(&get_home())
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
