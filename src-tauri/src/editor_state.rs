use anyhow::Result;
use log::info;
use ropey::Rope;
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::{fs::File, io::BufWriter};

#[derive(Debug, Clone)]
pub struct Document {
    pub path: String,
    pub text: Rope,
    pub changed: bool,
}

#[derive(Debug)]
pub struct EditorState {
    pub documents: HashMap<String, Document>,
}

impl EditorState {
    pub fn new() -> Self {
        Self {
            documents: HashMap::new(),
        }
    }

    pub fn load_document(&mut self, path: String) -> anyhow::Result<&mut Document> {
        let file = File::open(&path)?;
        let text = ropey::Rope::from_reader(file)?;
        match self.documents.entry(path.clone()) {
            Entry::Occupied(doc) => {
                let doc = doc.into_mut();
                doc.text = text;
                Ok(doc)
            }
            Entry::Vacant(map) => {
                let doc = Document {
                    path,
                    text,
                    changed: false,
                };
                Ok(map.insert(doc))
            }
        }
    }

    pub fn get_document(&mut self, path: String) -> anyhow::Result<&mut Document> {
        match self.documents.entry(path.clone()) {
            Entry::Occupied(doc) => Ok(doc.into_mut()),
            Entry::Vacant(map) => {
                let file = File::open(&path)?;
                let text = ropey::Rope::from_reader(file)?;
                let doc = Document {
                    path,
                    text,
                    changed: false,
                };
                Ok(map.insert(doc))
            }
        }
    }

    pub fn write_all(&mut self) -> Result<()> {
        for (_, doc) in self.documents.iter_mut() {
            if !doc.changed {
                continue;
            }

            info!("Write rope to file (path={})", doc.path);
            doc.text
                .write_to(BufWriter::new(File::create(&doc.path)?))?;
            doc.changed = false;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use serial_test::serial;

    use crate::editor_state::EditorState;
    use crate::testutil::{create_test_workspace, get_test_dir_as_string};

    #[test]
    #[serial]
    fn test_editor_state() {
        create_test_workspace();

        let path = format!("{}/README.md", get_test_dir_as_string()).to_string();

        let mut editor_state = EditorState::new();
        let doc = editor_state.get_document(path.clone()).unwrap();

        assert_eq!(doc.path, path);
        assert_eq!(doc.text.to_string(), "".to_string());

        doc.text.insert(0, "test");

        let doc = editor_state.get_document(path.clone()).unwrap();
        assert_eq!(doc.text.to_string(), "test".to_string());

        let doc = editor_state.load_document(path.clone()).unwrap();
        assert_eq!(doc.text.to_string(), "".to_string());

        doc.text.insert(0, "test");
        doc.changed = true;

        editor_state.write_all().unwrap();

        let doc = editor_state.load_document(path.clone()).unwrap();
        assert_eq!(doc.text.to_string(), "test".to_string());
    }
}
