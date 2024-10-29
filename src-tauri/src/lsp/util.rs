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
