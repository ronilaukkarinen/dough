function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.+?)\*/g, "$1")        // *italic*
    .replace(/__(.+?)__/g, "$1")        // __bold__
    .replace(/_(.+?)_/g, "$1")          // _italic_
    .replace(/~~(.+?)~~/g, "$1")        // ~~strikethrough~~
    .replace(/`(.+?)`/g, "$1")          // `code`
    .replace(/^#{1,6}\s+/gm, "")        // # headings
    .replace(/^\s*[-*+]\s+/gm, "- ")    // normalize list bullets
    .replace(/^\s*\d+\.\s+/gm, "")      // numbered lists
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // [link](url)
    .replace(/!\[.*?\]\(.+?\)/g, "")    // ![image](url)
    .replace(/^>\s?/gm, "")             // > blockquotes
    .replace(/\n{3,}/g, "\n\n")         // collapse extra newlines
    .trim();
}

export function copyToClipboard(text: string): Promise<void> {
  const plain = stripMarkdown(text);
  try {
    return navigator.clipboard.writeText(plain);
  } catch {
    // Fallback for Safari
    const textarea = document.createElement("textarea");
    textarea.value = plain;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return Promise.resolve();
  }
}
