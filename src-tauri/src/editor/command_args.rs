use crate::editor::pathutil::{dirname, expand_tilde, home_dir, path_buf_to_string, resolve_path};
use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};
use std::collections::HashMap;
use std::env;
use url::Url;

#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Args {
    // current working dir: `./path/to`
    pub cwd: Option<String>,
    // source arg: `tinywrite ./source`
    pub source: Option<String>,
    // source file: `tinywrite ./path/to/file.md`
    pub file: Option<String>,
    // source file: `tinywrite ./path/to/not_existing_file.md`
    pub new_file: Option<String>,
    // collab room from deeplink
    pub room: Option<String>,
    // text from deeplink
    pub text: Option<String>,
}

#[tauri::command]
pub fn get_args(state: tauri::State<Args>) -> Args {
    state.inner().clone()
}

pub fn create_args(source: String) -> Args {
    let mut file = None;
    let mut new_file = None;
    let mut room = None;
    let mut text = None;
    let mut cwd = None;

    if source.starts_with("tinywrite://") {
        if let Ok(url) = Url::parse(&source) {
            let params: HashMap<_, _> = url.query_pairs().into_owned().collect();
            room = params.get("room").cloned();
            text = params
                .get("text")
                .and_then(|x| general_purpose::STANDARD.decode(x).ok())
                .and_then(|x| String::from_utf8(x).ok());
        }
    } else if !source.is_empty() {
        // If source path exists
        if let Ok(p) = resolve_path(&source, None) {
            if p.is_dir() {
                cwd = path_buf_to_string(p).ok();
            } else {
                file = path_buf_to_string(&p).ok();
                cwd = dirname(p).and_then(path_buf_to_string).ok();
            }
        } else if let Some(p) = expand_tilde(&source) {
            let resoved_dir = dirname(&p).and_then(|d| resolve_path(d, None));
            // If parent dir exists
            if let Ok(d) = resoved_dir {
                let has_trailing_slash = p
                    .as_os_str()
                    .to_str()
                    .map(|s| s.ends_with(std::path::MAIN_SEPARATOR))
                    .unwrap_or(false);
                if !has_trailing_slash {
                    new_file = path_buf_to_string(p).ok();
                }

                cwd = path_buf_to_string(d).ok();
            }
        }
    }

    if cwd.is_none() {
        cwd = get_cwd().ok();
    }

    Args {
        cwd,
        file,
        new_file,
        room,
        text,
        source: Some(source),
    }
}

fn get_cwd() -> Result<String> {
    let mut cwd = env::current_dir()?;
    if cwd.parent().is_none() {
        if let Some(home) = home_dir() {
            env::set_current_dir(home)?;
        }

        cwd = env::current_dir()?;
    }

    let cwd = path_buf_to_string(cwd)?;
    Ok(cwd)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_create_args() {
        // Empty stringsource
        let args = create_args("".to_string());
        assert_eq!(
            Path::new(&args.cwd.as_ref().unwrap()),
            env::current_dir().unwrap()
        );
        assert!(args.file.is_none());
        assert!(args.room.is_none());
        assert!(args.text.is_none());

        // Existing file
        let args = create_args("../README.md".to_string());
        assert_eq!(
            Path::new(&args.cwd.as_ref().unwrap()),
            env::current_dir().unwrap().parent().unwrap()
        );
        assert_eq!(
            Path::new(&args.file.as_ref().unwrap()),
            Path::new("../README.md").canonicalize().unwrap()
        );
        assert!(args.new_file.is_none());
        assert!(args.room.is_none());
        assert!(args.text.is_none());

        // File not found and dirname not found
        let args = create_args("../xyz/README.md".to_string());
        assert!(args.file.is_none());
        assert!(args.new_file.is_none());
        assert!(args.room.is_none());
        assert!(args.text.is_none());

        // File not found but dirname exists
        let args = create_args("../README.m".to_string());
        assert!(args.file.is_none());
        assert_eq!(&args.new_file.unwrap(), "../README.m");
        assert!(args.room.is_none());
        assert!(args.text.is_none());

        // Source is a directory
        let args = create_args("../src-tauri/".to_string());
        assert!(args.file.is_none());
        assert!(args.new_file.is_none());
        assert_eq!(
            Path::new(&args.cwd.as_ref().unwrap()),
            env::current_dir().unwrap()
        );
        assert!(args.room.is_none());
        assert!(args.text.is_none());

        // Source is a directory that does not exist
        let args = create_args("../srcc/".to_string());
        assert!(args.file.is_none());
        assert!(args.new_file.is_none());
        assert!(args.room.is_none());
        assert!(args.text.is_none());
        assert_eq!(
            Path::new(&args.cwd.as_ref().unwrap()),
            env::current_dir().unwrap().parent().unwrap()
        );

        // Deeplink collab room
        let args = create_args("tinywrite://test?room=123".to_string());
        assert_eq!(args.room, Some("123".to_string()));

        // Deeplink text
        let args = create_args("tinywrite://test?text=dGVzdA==".to_string());
        assert_eq!(args.text, Some("test".to_string()));
    }
}
