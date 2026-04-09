use crate::editor::pathutil::{self as pu};
use anyhow::anyhow;
use globset::Glob;
use ignore::WalkBuilder;
use serde::Serialize;
use std::cmp::Ordering;
use std::path::PathBuf;
use tracing::info;

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
#[non_exhaustive]
pub struct DirEntry {
    pub name: String,
    pub path: PathBuf,
    pub relative_path: String,
    pub is_directory: bool,
    pub is_file: bool,
    pub is_symlink: bool,
}

#[tauri::command]
pub fn list_contents(
    path: String,
    base_path: Option<String>,
    max_items: Option<usize>,
) -> tauri::Result<Vec<DirEntry>> {
    let path = PathBuf::from(&path);
    let base_path = base_path.map(PathBuf::from);

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
    let walker = WalkBuilder::new(dir)
        .max_depth(Some(1))
        .sort_by_file_path(|a, b| {
            // fallback: check if it has a trailing slash or other heuristic (not perfect)
            let a_is_dir = a
                .metadata()
                .map(|m| m.is_dir())
                .unwrap_or_else(|_| a.is_dir());
            let b_is_dir = b
                .metadata()
                .map(|m| m.is_dir())
                .unwrap_or_else(|_| b.is_dir());

            match (a_is_dir, b_is_dir) {
                (true, true) | (false, false) => a.cmp(b),
                (true, false) => Ordering::Less,
                (false, true) => Ordering::Greater,
            }
        })
        .build();

    let files = walker
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name().to_string_lossy().to_string();

            let relative_path = pu::to_relative_path(entry.clone().into_path(), base_path.clone())
                .and_then(pu::path_buf_to_string)
                .ok()?;

            let (is_directory, is_file, is_symlink) = entry
                .metadata()
                .map(|m| (m.is_dir(), m.is_file(), m.is_symlink()))
                .unwrap_or((false, false, false));

            match glob.is_match(entry.clone().into_path()) {
                true => Some(DirEntry {
                    name,
                    path: entry.into_path(),
                    relative_path,
                    is_directory,
                    is_file,
                    is_symlink,
                }),
                false => None,
            }
        })
        .take(max_items.unwrap_or(usize::MAX))
        .collect();

    Ok(files)
}

#[cfg(test)]
mod tests {
    use std::env;

    use serial_test::serial;

    use super::*;

    use crate::editor::{
        pathutil::home_dir,
        testutil::{create_test_workspace, get_home_as_string},
    };

    #[test]
    #[serial]
    fn test_list_contents() {
        create_test_workspace(true);

        assert_eq!(
            list_contents("./Ca".to_string(), None, None).unwrap(),
            vec![
                DirEntry {
                    name: "Cargo.lock".to_string(),
                    path: env::current_dir().unwrap().join("Cargo.lock"),
                    relative_path: "./Cargo.lock".to_string(),
                    is_file: true,
                    is_directory: false,
                    is_symlink: false
                },
                DirEntry {
                    name: "Cargo.toml".to_string(),
                    path: env::current_dir().unwrap().join("Cargo.toml"),
                    relative_path: "./Cargo.toml".to_string(),
                    is_file: true,
                    is_directory: false,
                    is_symlink: false
                },
            ]
        );

        assert_eq!(
            list_contents("./src/m".to_string(), None, None).unwrap(),
            vec![
                DirEntry {
                    path: env::current_dir().unwrap().join("src/menu"),
                    relative_path: "./src/menu".to_string(),
                    name: "menu".to_string(),
                    is_file: false,
                    is_directory: true,
                    is_symlink: false
                },
                DirEntry {
                    path: env::current_dir().unwrap().join("src/main.rs"),
                    relative_path: "./src/main.rs".to_string(),
                    name: "main.rs".to_string(),
                    is_file: true,
                    is_directory: false,
                    is_symlink: false
                },
            ]
        );

        assert_eq!(
            list_contents("~/tinyw".to_string(), None, None).unwrap(),
            vec![DirEntry {
                path: home_dir().unwrap().join("tinywrite"),
                relative_path: "~/tinywrite".to_string(),
                name: "tinywrite".to_string(),
                is_file: false,
                is_directory: true,
                is_symlink: false
            },]
        );

        assert_eq!(
            list_contents("~/tinywrite/".to_string(), None, None).unwrap(),
            vec![
                DirEntry {
                    path: home_dir().unwrap().join("tinywrite/src"),
                    relative_path: "~/tinywrite/src".to_string(),
                    name: "src".to_string(),
                    is_file: false,
                    is_directory: true,
                    is_symlink: false
                },
                DirEntry {
                    path: home_dir().unwrap().join("tinywrite/README.md"),
                    relative_path: "~/tinywrite/README.md".to_string(),
                    name: "README.md".to_string(),
                    is_file: true,
                    is_directory: false,
                    is_symlink: false
                },
            ]
        );

        assert_eq!(
            list_contents("./tinyw".to_string(), Some(get_home_as_string()), None).unwrap(),
            vec![DirEntry {
                path: home_dir().unwrap().join("tinywrite"),
                relative_path: "./tinywrite".to_string(),
                name: "tinywrite".to_string(),
                is_file: false,
                is_directory: true,
                is_symlink: false
            },]
        );

        assert_eq!(
            list_contents("./tinywrite/".to_string(), Some(get_home_as_string()), None).unwrap(),
            vec![
                DirEntry {
                    path: home_dir().unwrap().join("tinywrite/src"),
                    relative_path: "./tinywrite/src".to_string(),
                    name: "src".to_string(),
                    is_file: false,
                    is_directory: true,
                    is_symlink: false
                },
                DirEntry {
                    path: home_dir().unwrap().join("tinywrite/README.md"),
                    relative_path: "./tinywrite/README.md".to_string(),
                    name: "README.md".to_string(),
                    is_file: true,
                    is_directory: false,
                    is_symlink: false
                },
            ]
        );

        assert!(!list_contents("~/".to_string(), None, None)
            .unwrap()
            .is_empty());

        assert!(!list_contents("./icons/".to_string(), None, None)
            .unwrap()
            .is_empty());

        assert!(!list_contents("".to_string(), None, None)
            .unwrap()
            .is_empty());
    }
}
