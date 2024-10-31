use lsp_types::Position;
use ropey::Rope;

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

#[cfg(test)]
mod tests {
    use lsp_types::Position;
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
