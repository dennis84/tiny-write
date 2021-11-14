#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::collections::HashMap;
use std::env;
use std::io::{Error, ErrorKind};
use std::path::{Path, PathBuf};
use url::Url;

#[derive(Clone, Debug, serde::Serialize)]
struct Args {
    pub cwd: Option<String>,
    pub file: Option<String>,
    pub room: Option<String>,
    pub text: Option<String>,
    pub dark_mode: Option<bool>,
}

#[tauri::command]
fn get_args(state: tauri::State<Args>) -> Args {
    state.inner().clone()
}

#[tauri::command]
fn get_mime_type(path: String) -> String {
    let guess = mime_guess::from_path(path);
    guess.first_raw().unwrap_or("").to_string()
}

#[tauri::command]
fn resolve(paths: Vec<String>) -> Result<String, String> {
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

fn create_args(args: Vec<String>) -> Args {
    let mut file = None;
    let mut room = None;
    let mut text = None;

    match args.get(0) {
        Some(arg) if arg.starts_with("tinywrite://") => {
            if let Some(url) = Url::parse(arg).ok() {
                let params: HashMap<_, _> = url.query_pairs().into_owned().collect();
                room = params.get("room").map(|x| x.clone());
                text = params
                    .get("text")
                    .and_then(|x| base64::decode(x).ok())
                    .and_then(|x| String::from_utf8(x).ok());
            }
        }
        Some(arg) => file = resolve(vec![arg.clone()]).ok(),
        None => {}
    }

    let cwd = env::current_dir()
        .map(|x| x.into_os_string().into_string().unwrap())
        .ok();

    Args {
        cwd: cwd,
        file: file,
        room: room,
        text: text,
        dark_mode: None,
    }
}

fn main() {
    tauri::Builder::default()
        .manage(create_args(env::args().skip(1).collect::<Vec<_>>()))
        .invoke_handler(tauri::generate_handler![get_args, get_mime_type, resolve])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;

    #[test]
    fn test_create_args() {
        let args = create_args(vec!["../README.md".to_string()]);
        assert_eq!(
            Path::new(&args.cwd.as_ref().unwrap()),
            env::current_dir().unwrap()
        );

        assert_eq!(
            Path::new(&args.file.as_ref().unwrap()),
            Path::new("../README.md").canonicalize().unwrap()
        );

        assert!(args.room.is_none());
        assert!(args.text.is_none());
        assert!(args.dark_mode.is_none());

        let args = create_args(vec!["tinywrite://test?room=123".to_string()]);
        assert_eq!(args.room, Some("123".to_string()));

        let args = create_args(vec!["tinywrite://test?text=dGVzdA==".to_string()]);
        assert_eq!(args.text, Some("test".to_string()));
    }

    #[test]
    fn test_resolve() {
        let home = std::env::var("HOME").unwrap();
        File::create(format!("{}/{}", &home, "foo.txt")).unwrap();

        let cur = env::current_dir()
            .unwrap()
            .into_os_string()
            .into_string()
            .unwrap();

        assert_eq!(
            resolve(vec!["~/foo.txt".to_string()]).unwrap(),
            format!("{}/foo.txt", &home)
        );

        assert_eq!(
            resolve(vec![home.clone(), "./foo.txt".to_string()]).unwrap(),
            format!("{}/foo.txt", &home)
        );

        assert_eq!(
            resolve(vec![home.clone(), "/etc/hosts".to_string()]).unwrap(),
            "/etc/hosts"
        );

        assert_eq!(
            resolve(vec!["./Cargo.toml".to_string()]).unwrap(),
            format!("{}/Cargo.toml", cur),
        );
    }
}
