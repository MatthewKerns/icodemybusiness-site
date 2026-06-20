const MAX_EXTRACT_CHARS = 50_000;

const TEXTUAL_MIME_PREFIXES = [
  "text/",
  "application/json",
  "application/xml",
  "application/yaml",
  "application/x-yaml",
];

const TEXTUAL_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".yaml",
  ".yml",
  ".log",
];

export function isTextualMime(mime: string, name: string): boolean {
  const lowerMime = mime.toLowerCase();
  if (TEXTUAL_MIME_PREFIXES.some((p) => lowerMime.startsWith(p))) return true;
  const lowerName = name.toLowerCase();
  return TEXTUAL_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export async function extractTextFromUpload(
  buffer: ArrayBuffer,
  mime: string,
  name: string
): Promise<{ text: string; extractedChars: number; isSupported: boolean }> {
  if (!isTextualMime(mime, name)) {
    return { text: "", extractedChars: 0, isSupported: false };
  }
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const truncated = decoded.slice(0, MAX_EXTRACT_CHARS);
  return {
    text: truncated,
    extractedChars: truncated.length,
    isSupported: true,
  };
}

export { MAX_EXTRACT_CHARS };
