use crate::pathutil::{dirname, path_buf_to_string, resolve_path};
use std::collections::HashMap;
use std::env;
use url::Url;

#[derive(Clone, Debug, serde::Serialize)]
pub struct Args {
    pub cwd: Option<String>,
    pub file: Option<String>,
    pub room: Option<String>,
    pub text: Option<String>,
}

#[tauri::command]
pub fn get_args(state: tauri::State<Args>) -> Args {
    state.inner().clone()
}

pub fn create_args(source: String) -> Args {
    let mut file = None;
    let mut room = None;
    let mut text = None;
    let mut cwd = None;

    if source.starts_with("tinywrite://") {
        if let Some(url) = Url::parse(&source).ok() {
            let params: HashMap<_, _> = url.query_pairs().into_owned().collect();
            room = params.get("room").map(|x| x.clone());
            text = params
                .get("text")
                .and_then(|x| base64::decode(x).ok())
                .and_then(|x| String::from_utf8(x).ok());
        }
    } else if source != "" {
        if let Ok(p) = resolve_path(vec![source]) {
            if p.is_dir() {
                cwd = path_buf_to_string(p).ok();
            } else {
                file = path_buf_to_string(&p).ok();
                cwd = dirname(p).and_then(|d| path_buf_to_string(d)).ok();
            }
        }
    }

    if cwd.is_none() {
        cwd = env::current_dir()
            .and_then(|x| {
                if x.parent().is_none() {
                    if let Some(home) = dirs::home_dir() {
                        env::set_current_dir(home)?;
                    }

                    return env::current_dir();
                }

                Ok(x)
            })
            .and_then(|x| path_buf_to_string(x)).ok();
    }

    Args {
        cwd: cwd,
        file: file,
        room: room,
        text: text,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_create_args() {
        let args = create_args("".to_string());
        assert_eq!(
            Path::new(&args.cwd.as_ref().unwrap()),
            env::current_dir().unwrap()
        );
        assert!(args.file.is_none());
        assert!(args.room.is_none());
        assert!(args.text.is_none());

        let args = create_args("../README.md".to_string());
        assert_eq!(
            Path::new(&args.cwd.as_ref().unwrap()),
            env::current_dir().unwrap().parent().unwrap()
        );
        assert_eq!(
            Path::new(&args.file.as_ref().unwrap()),
            Path::new("../README.md").canonicalize().unwrap()
        );
        assert!(args.room.is_none());
        assert!(args.text.is_none());

        let args = create_args("..".to_string());
        assert_eq!(
            Path::new(&args.cwd.as_ref().unwrap()),
            env::current_dir().unwrap().parent().unwrap()
        );
        assert!(args.file.is_none());

        let args = create_args("tinywrite://test?room=123".to_string());
        assert_eq!(args.room, Some("123".to_string()));

        let args = create_args("tinywrite://test?text=dGVzdA==".to_string());
        assert_eq!(args.text, Some("test".to_string()));
    }
}
