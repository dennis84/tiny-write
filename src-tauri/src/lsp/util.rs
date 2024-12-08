use std::path::Path;

use async_lsp::lsp_types::{InitializeResult, Position, Url};
use ropey::Rope;

use crate::editor::editor_state::is_buffer;

use super::service::OffsetEncoding;

pub fn pos_to_lsp_pos(doc: &Rope, pos: usize, offset_encoding: OffsetEncoding) -> Position {
    let pos = doc.utf16_cu_to_char(pos);

    match offset_encoding {
        OffsetEncoding::Utf8 => {
            let line = doc.char_to_line(pos);
            let line_start = doc.line_to_byte(line);
            let col = doc.char_to_byte(pos) - line_start;

            Position::new(line as u32, col as u32)
        }
        OffsetEncoding::Utf16 => {
            let line = doc.char_to_line(pos);
            let line_start = doc.char_to_utf16_cu(doc.line_to_char(line));
            let col = doc.char_to_utf16_cu(pos) - line_start;

            Position::new(line as u32, col as u32)
        }
        OffsetEncoding::Utf32 => {
            let line = doc.char_to_line(pos);
            let line_start = doc.line_to_char(line);
            let col = pos - line_start;

            Position::new(line as u32, col as u32)
        }
    }
}

pub fn get_offset_encoding(config: &InitializeResult) -> OffsetEncoding {
    config
        .capabilities
        .position_encoding
        .as_ref()
        .and_then(|encoding| match encoding.as_str() {
            "utf-8" => Some(OffsetEncoding::Utf8),
            "utf-16" => Some(OffsetEncoding::Utf16),
            "utf-32" => Some(OffsetEncoding::Utf32),
            encoding => {
                log::error!(
                    "Server provided invalid position encoding {encoding}, defaulting to utf-16"
                );
                None
            }
        })
        .unwrap_or_default()
}

pub fn url_for_path(path: &Path) -> Url {
    if is_buffer(path) {
        Url::parse(&path.to_string_lossy()).unwrap()
    } else {
        Url::from_file_path(path).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use async_lsp::lsp_types::Position;
    use ropey::Rope;

    use super::pos_to_lsp_pos;

    use crate::lsp::service::OffsetEncoding;

    #[tokio::test]
    async fn test_pos_to_lsp_pos() {
        let mut doc = Rope::new();
        let lsp_pos = pos_to_lsp_pos(&doc, 0, OffsetEncoding::Utf16);
        assert_eq!(lsp_pos, Position::new(0, 0));

        doc.insert(0, "1");
        let lsp_pos = pos_to_lsp_pos(&doc, 0, OffsetEncoding::Utf16);
        assert_eq!(lsp_pos, Position::new(0, 0));

        doc.insert(1, "2");
        let lsp_pos = pos_to_lsp_pos(&doc, 1, OffsetEncoding::Utf16);
        assert_eq!(lsp_pos, Position::new(0, 1));

        doc.insert(2, "\n");
        let lsp_pos = pos_to_lsp_pos(&doc, 2, OffsetEncoding::Utf16);
        assert_eq!(lsp_pos, Position::new(0, 2));

        doc.remove(2..3);
        let lsp_pos = pos_to_lsp_pos(&doc, 1, OffsetEncoding::Utf16);
        assert_eq!(lsp_pos, Position::new(0, 1));
    }
}
