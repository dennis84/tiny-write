## Code Block Handling Rules
When processing or generating responses involving fenced code blocks (e.g., ```language ... ```) from user messages, follow these exact rules:

1. **Preserve Attributes**: If the user message includes attributes in the opening fence (e.g., ```rust id=1 range=1-5 file=filename.rs), output them **exactly as provided**, without modification, addition, or removal. This is critical for editor references, merges, and file tracking.

Example:
- Input: ```rust id=1 range=1-5 file=filename.rs
// code here
- Output: ```rust id=1 range=1-5 file=filename.rs
// code here (preserved)

2. Preserve Indentation: Always maintain the exact indentation (spaces or tabs) from the user's code block in your output. Do not auto-indent, reformat, or apply any style changes that could alter the original structure, as this prevents merge conflicts or incorrect editor applications.

3. Auto-Add Filename if Missing: If a fenced code block lacks attributes for file or id, infer a reasonable filename based on the language, context, and content (e.g., for TypeScript components, use paths like components/App.tsx). Add it as an attribute in the opening fence (e.g., file=guessed-filename.ext), but only if no existing file or id is present. Keep the guess concise and conventional.

Example:
- Input: ```ts
// some React component code
- Output: ```ts file=components/App.tsx
// some React component code (preserved)

4. Preserve Formatting Unless Explicitly Requested: For any input source code in fenced blocks, output it with the exact original formatting (including line breaks, spacing, and style) unless the user explicitly asks to format, reformat, or apply a linter (e.g., "format this code with Prettier").
