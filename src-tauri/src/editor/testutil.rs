use std::{fs::File, path::PathBuf};

use crate::editor::pathutil::{home_dir, path_buf_to_string};

pub fn create_test_workspace() {
    let _ = std::fs::remove_dir_all(get_test_dir());
    std::fs::create_dir(get_test_dir()).unwrap();

    // create worktree root
    std::fs::create_dir(get_test_dir().join(".git")).unwrap();
    File::create(get_test_dir().join(".git").join("config")).unwrap();

    // root files
    File::create(get_test_dir().join("README.md")).unwrap();

    // src files
    std::fs::create_dir(get_test_dir().join("src")).unwrap();
    File::create(get_test_dir().join("src").join("main.rs")).unwrap();
    File::create(get_test_dir().join("src").join("index.ts")).unwrap();
}

pub fn get_home() -> PathBuf {
    home_dir().unwrap()
}

pub fn get_home_as_string() -> String {
    path_buf_to_string(get_home()).unwrap()
}

pub fn get_test_dir() -> PathBuf {
    get_home().join("tinywrite")
}
