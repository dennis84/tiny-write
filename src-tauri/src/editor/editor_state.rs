use anyhow::anyhow;
use async_channel::{unbounded, Receiver, Sender};
use log::{debug, info};
use ropey::Rope;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::fs::{self, File};
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use std::time::SystemTime;

use super::pathutil::to_relative_path;

#[derive(Debug, Clone, PartialEq, Hash, Eq, Serialize, Deserialize)]
pub struct Language(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub path: PathBuf,
    pub worktree_path: Option<PathBuf>,
    #[serde(skip)]
    pub text: Rope,
    pub language: Option<Language>,
    pub last_modified: SystemTime,
    pub version: i32,
}

impl Document {
    pub fn get_language_id(&self) -> String {
        self.language.clone().map(|l| l.0).unwrap_or("".to_string())
    }

    pub fn get_relative_path(&self) -> PathBuf {
        to_relative_path(&self.path, self.worktree_path.as_ref()).unwrap_or(self.path.clone())
    }
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Insert {
    pub from_a: usize,
    pub to_b: usize,
    pub text: String,
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Delete {
    pub from_a: usize,
    pub to_a: usize,
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDocument {
    pub text: String,
    pub language: Option<Language>,
}

pub struct EditorState {
    pub documents: RwLock<HashMap<PathBuf, Document>>,
    pub open_doc_tx: Sender<PathBuf>,
    pub open_doc_rx: Receiver<PathBuf>,
}

impl EditorState {
    pub fn new() -> Self {
        let (open_doc_tx, open_doc_rx) = unbounded();

        Self {
            documents: RwLock::new(HashMap::new()),
            open_doc_tx,
            open_doc_rx,
        }
    }

    pub async fn get_document(&self, path: &Path) -> anyhow::Result<Document> {
        debug!("Get document (path={:?})", path);

        let is_buffer = is_buffer(path);

        if !is_buffer && !fs::exists(path)? {
            debug!("Create file (path={:?})", path);
            File::create(path)?;
        }

        let last_modified = if is_buffer {
            SystemTime::now()
        } else {
            fs::metadata(path)?.modified()?
        };

        let mut new_doc = false;

        match self.documents.write().unwrap().entry(path.to_path_buf()) {
            Entry::Occupied(doc) => {
                let doc = doc.into_mut();
                if !is_buffer && last_modified > doc.last_modified {
                    debug!("Update file contents (path={:?})", path);
                    let file = File::open(path)?;
                    let text = ropey::Rope::from_reader(file)?;
                    doc.text = text;
                    doc.last_modified = last_modified;
                    doc.version += 1
                }
            }
            Entry::Vacant(map) => {
                let language = Self::get_language(path);
                let worktree_path = Self::get_worktree_path(path);

                let text = if is_buffer {
                    ropey::Rope::new()
                } else {
                    let file = File::open(path)?;
                    ropey::Rope::from_reader(file)?
                };

                let doc = Document {
                    path: path.to_path_buf(),
                    text,
                    worktree_path,
                    language,
                    last_modified: SystemTime::now(),
                    version: 0,
                };

                map.insert(doc);
                new_doc = true;
            }
        };

        if new_doc {
            self.open_doc_tx.send(path.to_path_buf()).await?;
        }

        let doc = self
            .documents
            .read()
            .unwrap()
            .get(&path.to_path_buf())
            .cloned()
            .ok_or(anyhow!("Document not found"))?;
        Ok(doc)
    }

    pub fn insert_text(&self, path: &Path, data: &Insert) -> anyhow::Result<()> {
        let mut docs = self.documents.write().unwrap();

        let doc = docs.get_mut(path).ok_or(anyhow!("No doc"))?;
        let from = doc.text.utf16_cu_to_char(data.from_a);

        doc.text.insert(from, &data.text);
        doc.last_modified = SystemTime::now();
        doc.version += 1;

        Ok(())
    }

    pub fn delete_text(&self, path: &Path, data: &Delete) -> anyhow::Result<()> {
        let mut docs = self.documents.write().unwrap();
        let doc = docs.get_mut(path).ok_or(anyhow!("No doc"))?;

        let from = doc.text.utf16_cu_to_char(data.from_a);
        let to = doc.text.utf16_cu_to_char(data.to_a);

        doc.text.remove(from..to);
        doc.last_modified = SystemTime::now();
        doc.version += 1;

        Ok(())
    }

    pub fn replace_text(&self, path: &Path, data: &UpdateDocument) -> anyhow::Result<()> {
        let mut docs = self.documents.write().unwrap();
        let doc = docs.get_mut(path).ok_or(anyhow!("No doc"))?;

        doc.text = Rope::from_str(&data.text);
        doc.language = data.language.clone();
        doc.last_modified = SystemTime::now();
        doc.version += 1;

        Ok(())
    }

    pub fn write_document(&self, path: &Path) -> anyhow::Result<()> {
        let docs = self.documents.read().unwrap();
        let doc = docs
            .get(&path.to_path_buf())
            .ok_or(anyhow!("Document not found"))?;

        info!("Write rope to file (path={:?})", doc.path);
        doc.text
            .write_to(BufWriter::new(File::create(&doc.path)?))?;
        Ok(())
    }

    fn get_language<P: AsRef<Path>>(path: P) -> Option<Language> {
        match path.as_ref().extension().and_then(OsStr::to_str) {
            Some("ts") | Some("tsx") => Some(Language("typescript".to_string())),
            Some("rs") => Some(Language("rust".to_string())),
            _ => None,
        }
    }

    fn get_worktree_path<P: AsRef<Path>>(path: P) -> Option<PathBuf> {
        let mut path = path.as_ref().canonicalize().ok()?;
        if !path.is_dir() {
            path = path.parent().map(|p| p.to_path_buf())?;
        }

        let git_config: PathBuf = path.join(".git").join("config");
        if git_config.exists() {
            Some(path.to_path_buf())
        } else {
            let parent = path.parent()?;
            Self::get_worktree_path(parent)
        }
    }
}

pub fn is_buffer(path: &Path) -> bool {
    path.starts_with("buffer://")
}

#[cfg(test)]
mod tests {
    use std::fs::File;
    use std::io::prelude::*;
    use std::path::Path;
    use std::time::SystemTime;
    use std::{thread, time};

    use ropey::Rope;
    use serial_test::serial;

    use crate::editor::editor_state::{EditorState, Insert, UpdateDocument};
    use crate::editor::testutil::{create_test_workspace, get_test_dir};

    use super::{Document, Language};

    #[test]
    #[serial]
    fn test_document() {
        create_test_workspace(true);

        let path = get_test_dir().join("src").join("index.ts");

        let doc = Document {
            path: path.clone(),
            worktree_path: Some(get_test_dir()),
            language: Some(Language("javascript".to_string())),
            text: Rope::new(),
            last_modified: SystemTime::now(),
            version: 0,
        };

        assert_eq!(
            "./src/index.ts".to_string(),
            doc.get_relative_path().to_string_lossy().to_string()
        );
    }

    #[tokio::test]
    #[serial]
    async fn test_get_document_err() {
        create_test_workspace(true);

        let path = get_test_dir();

        let editor_state = EditorState::new();
        let doc = editor_state.get_document(path.as_ref()).await;

        assert!(doc.is_err());
    }

    #[tokio::test]
    #[serial]
    async fn test_buffer() {
        create_test_workspace(true);

        let editor_state = EditorState::new();
        let path = Path::new("buffer://123");
        let doc = editor_state.get_document(path.as_ref()).await.unwrap();

        assert_eq!(doc.path, path.to_path_buf());
        assert_eq!(doc.text.to_string(), "".to_string());
        assert_eq!(doc.language, None);

        let language = Language("typescript".to_string());

        editor_state
            .replace_text(
                path.as_ref(),
                &UpdateDocument {
                    text: "test".to_string(),
                    language: Some(language.clone()),
                },
            )
            .unwrap();

        let doc = editor_state.get_document(path.as_ref()).await.unwrap();
        assert_eq!(doc.text.to_string(), "test".to_string());
        assert_eq!(doc.language, Some(language));
    }

    #[tokio::test]
    #[serial]
    async fn test_editor_state() {
        create_test_workspace(true);

        let path = get_test_dir().join("README.md");

        let editor_state = EditorState::new();

        let v0_doc = editor_state.get_document(path.as_ref()).await.unwrap();
        assert_eq!(v0_doc.path, path.to_path_buf());
        assert_eq!(v0_doc.text.to_string(), "".to_string());

        editor_state
            .insert_text(
                path.as_ref(),
                &Insert {
                    from_a: 0,
                    to_b: 5,
                    text: "test".to_string(),
                },
            )
            .unwrap();

        let v1_doc = editor_state.get_document(path.as_ref()).await.unwrap();
        assert_ne!(v1_doc.last_modified, v0_doc.last_modified);

        let get_again_doc = editor_state.get_document(path.as_ref()).await.unwrap();
        assert_eq!(get_again_doc.text, v1_doc.text);
        assert_eq!(get_again_doc.last_modified, v1_doc.last_modified);

        thread::sleep(time::Duration::from_millis(10));
        let mut file = File::create(&path).unwrap();
        file.write_all(b"updated").unwrap();

        let get_after_write = editor_state.get_document(path.as_ref()).await.unwrap();
        assert_ne!(get_after_write.text, v1_doc.text);
        assert_ne!(get_after_write.last_modified, v1_doc.last_modified);
    }

    #[tokio::test]
    #[serial]
    async fn test_editor_state_2() {
        create_test_workspace(true);

        let path = get_test_dir().join("README.md");

        let editor_state = EditorState::new();
        let doc = editor_state.get_document(path.as_ref()).await.unwrap();

        assert_eq!(doc.text.to_string(), "".to_string());

        editor_state
            .insert_text(
                path.as_ref(),
                &Insert {
                    from_a: 0,
                    to_b: 5,
                    text: "🧜‍♂️".to_string(),
                },
            )
            .unwrap();

        editor_state
            .insert_text(
                path.as_ref(),
                &Insert {
                    from_a: 5,
                    to_b: 6,
                    text: "1".to_string(),
                },
            )
            .unwrap();

        let doc = editor_state.get_document(path.as_ref()).await.unwrap();
        assert_eq!(doc.text.to_string(), "🧜‍♂️1".to_string());
    }
}
