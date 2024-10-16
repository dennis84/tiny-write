use lsp_types::Position;
use ropey::Rope;

pub fn pos_to_lsp_pos(doc: &Rope, pos: usize) -> Position {
    let line = doc.char_to_line(pos);
    let line_start = doc.line_to_byte(line);
    let col = doc.char_to_byte(pos) - line_start;

    Position::new(line as u32, col as u32)
}
