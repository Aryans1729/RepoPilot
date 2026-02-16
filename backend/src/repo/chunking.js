const crypto = require("crypto");

/**
 * Simple, deterministic chunker using characters as a proxy for tokens.
 * Approximation: 1 token ~= 4 chars for code/text in English.
 */

function approxTokensFromChars(chars) {
  return Math.ceil(chars / 4);
}

function makeChunkId(repoId, filePath, startLine, endLine) {
  const raw = `${repoId}:${filePath}:${startLine}:${endLine}`;
  return crypto.createHash("sha1").update(raw).digest("hex").slice(0, 16);
}

/**
 * Chunk by line windows until ~targetTokens, with overlap.
 * Returns chunks with { text, startLine, endLine } (1-indexed).
 */
function chunkTextByLines(text, { targetTokens = 800, overlapTokens = 120 } = {}) {
  const lines = text.split(/\r?\n/);
  const targetChars = targetTokens * 4;
  const overlapChars = overlapTokens * 4;

  const chunks = [];
  let i = 0;
  while (i < lines.length) {
    let chars = 0;
    let j = i;
    while (j < lines.length) {
      const next = lines[j].length + 1; // include newline
      if (chars + next > targetChars && chars > 0) break;
      chars += next;
      j++;
    }

    const slice = lines.slice(i, j);
    const chunkText = slice.join("\n");
    const startLine = i + 1;
    const endLine = j; // 1-indexed inclusive
    chunks.push({ text: chunkText, startLine, endLine });

    // Move forward with overlap
    if (j >= lines.length) break;

    // Compute overlap in lines by walking backwards until overlapChars reached
    let backChars = 0;
    let k = j - 1;
    while (k > i) {
      backChars += lines[k].length + 1;
      if (backChars >= overlapChars) break;
      k--;
    }
    i = Math.max(k, i + 1);
  }

  return chunks;
}

module.exports = {
  chunkTextByLines,
  approxTokensFromChars,
  makeChunkId,
};

