export function copyToClipboard(text: string): Promise<void> {
  try {
    return navigator.clipboard.writeText(text);
  } catch {
    // Fallback for Safari
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return Promise.resolve();
  }
}
