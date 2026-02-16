const path = require("path");

// Folder patterns to ignore anywhere in the repo
const IGNORE_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
  ".repopilot",
  "__pycache__",
  ".venv",
]);

// File extensions that are almost certainly binary / not useful to chunk
const BINARY_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".tgz",
  ".7z",
  ".jar",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".wasm",
  ".mp4",
  ".mov",
  ".mp3",
  ".wav",
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
]);

function shouldIgnorePath(relPath) {
  // Normalize to forward slashes for consistent matching
  const parts = relPath.split(path.sep).filter(Boolean);
  for (const part of parts) {
    if (IGNORE_DIR_NAMES.has(part)) return true;
  }
  return false;
}

function isTextLikeFile(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (BINARY_EXTS.has(ext)) return false;
  return true;
}

module.exports = {
  shouldIgnorePath,
  isTextLikeFile,
  IGNORE_DIR_NAMES,
  BINARY_EXTS,
};

