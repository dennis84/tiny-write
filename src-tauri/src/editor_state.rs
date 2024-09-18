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

    pub fn get_document(&mut self, path: String) -> anyhow::Result<&mut Document> {
        match self.documents.entry(path.clone()) {
            Entry::Occupied(doc) => Ok(doc.into_mut()),
            Entry::Vacant(map) => {
                let file = File::open(&path)?;
                let text = ropey::Rope::from_reader(file)?;
                let doc = Document { path, text, changed: false };
                Ok(map.insert(doc))
            }
        }
    }

    pub fn write_all(&mut self) -> Result<()> {
        for (path, doc) in self.documents.iter_mut() {
            if !doc.changed {
                continue;
            }

            info!("Write to file (path={})", path);
            doc.text.write_to(BufWriter::new(File::create(path)?))?;
            doc.changed = false;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::editor_state::EditorState;

    #[test]
    fn test_editor_state() {
        let mut editor_state = EditorState::new();
        let doc = editor_state.get_document("../README.md".to_string()).unwrap();

        assert_eq!(doc.path, "../README.md".to_string());
        assert_ne!(doc.text.to_string(), "".to_string());

        editor_state.write_all().unwrap();
    }
}
