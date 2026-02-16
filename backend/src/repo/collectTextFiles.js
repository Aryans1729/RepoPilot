const fs = require("fs");
const path = require("path");

const { shouldIgnorePath, isTextLikeFile } = require("../utils/ignore");

/**
 * Collect eligible text files for chunking/embedding.
 * - Ignores node_modules/.git/etc via shouldIgnorePath
 * - Skips binaries via isTextLikeFile
 * - Skips large files
 */
async function collectTextFiles(repoRootAbsPath, { maxFileBytes = 600_000 } = {}) {
  const out = [];
  walk(repoRootAbsPath, "");
  return out;

  function walk(absDir, relDir) {
    if (shouldIgnorePath(relDir || ".")) return;
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(absDir, entry.name);
      const rel = relDir ? path.join(relDir, entry.name) : entry.name;
      if (shouldIgnorePath(rel)) continue;

      if (entry.isDirectory()) {
        walk(abs, rel);
        continue;
      }

      if (!entry.isFile()) continue;
      const stat = fs.statSync(abs);
      if (stat.size > maxFileBytes) continue;
      if (!isTextLikeFile(abs)) continue;
      out.push({ absPath: abs, relPath: rel, size: stat.size });
    }
  }
}

module.exports = { collectTextFiles };

