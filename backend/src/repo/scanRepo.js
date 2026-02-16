const fs = require("fs");
const path = require("path");

const { shouldIgnorePath, isTextLikeFile } = require("../utils/ignore");

/**
 * Recursively builds a folder tree of the ingested repo.
 * This is Phase 1 output (UI displays it). Later phases will also reuse
 * the same scan to decide which files to chunk/embed.
 */
async function scanRepoStructure(repoRootAbsPath) {
  const rootName = path.basename(repoRootAbsPath);
  const tree = await walkDir(repoRootAbsPath, repoRootAbsPath, rootName);
  return tree;
}

async function walkDir(repoRootAbsPath, currentAbsPath, displayName) {
  const rel = path.relative(repoRootAbsPath, currentAbsPath) || ".";
  if (rel !== "." && shouldIgnorePath(rel)) {
    return null;
  }

  const stat = fs.statSync(currentAbsPath);
  if (!stat.isDirectory()) {
    const isText = isTextLikeFile(currentAbsPath);
    return {
      type: "file",
      name: displayName,
      path: rel,
      textLike: isText,
      size: stat.size,
    };
  }

  const entries = fs.readdirSync(currentAbsPath, { withFileTypes: true });
  const children = [];

  for (const entry of entries) {
    const abs = path.join(currentAbsPath, entry.name);
    const childRel = path.relative(repoRootAbsPath, abs);
    if (shouldIgnorePath(childRel)) continue;

    if (entry.isDirectory()) {
      const childTree = await walkDir(repoRootAbsPath, abs, entry.name);
      if (childTree) children.push(childTree);
    } else if (entry.isFile()) {
      const stat2 = fs.statSync(abs);
      // Skip huge files in the tree output to keep UI fast
      if (stat2.size > 2_000_000) continue;

      children.push({
        type: "file",
        name: entry.name,
        path: childRel,
        textLike: isTextLikeFile(abs),
        size: stat2.size,
      });
    }
  }

  // Sort dirs first, then files; alphabetical
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    type: "dir",
    name: displayName,
    path: rel,
    children,
  };
}

module.exports = { scanRepoStructure };

