const fs = require("fs");
const path = require("path");

const { getRepoLocalPath, getCachedStructure } = require("../services/repoIngestionService");
const { shouldIgnorePath, isTextLikeFile } = require("../utils/ignore");
const { createHttpError } = require("../utils/http");

/**
 * Agent tools (callable functions).
 * These are written as small, predictable functions so an LLM can call them safely.
 * Later: expose them to the agent loop via function-calling/tool-calling.
 */

async function getFolderStructure(repoId) {
  const structure = await getCachedStructure(repoId);
  if (!structure) throw createHttpError(404, "Repo not found or not ingested yet");
  return structure;
}

async function listFiles(repoId, folderPath = ".") {
  const root = await getRepoLocalPath(repoId);
  if (!root) throw createHttpError(404, "Repo not found");

  const rel = folderPath === "." ? "." : String(folderPath);
  if (shouldIgnorePath(rel)) return [];

  const abs = path.join(root, rel);
  const stat = fs.existsSync(abs) ? fs.statSync(abs) : null;
  if (!stat) throw createHttpError(404, "Folder not found");
  if (!stat.isDirectory()) throw createHttpError(400, "folderPath must point to a directory");

  const entries = fs.readdirSync(abs, { withFileTypes: true });
  return entries
    .filter((e) => !shouldIgnorePath(path.join(rel, e.name)))
    .map((e) => ({
      name: e.name,
      path: path.join(rel, e.name),
      type: e.isDirectory() ? "dir" : "file",
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

async function readFile(repoId, filePath) {
  const root = await getRepoLocalPath(repoId);
  if (!root) throw createHttpError(404, "Repo not found");

  const rel = String(filePath);
  if (shouldIgnorePath(rel)) throw createHttpError(400, "Path is ignored");

  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) throw createHttpError(404, "File not found");

  const stat = fs.statSync(abs);
  if (!stat.isFile()) throw createHttpError(400, "filePath must point to a file");
  if (stat.size > 300_000) throw createHttpError(413, "File too large to read");
  if (!isTextLikeFile(abs)) throw createHttpError(415, "Binary/non-text file");

  const text = await fs.promises.readFile(abs, "utf8");
  return { path: rel, size: stat.size, text };
}

async function searchCode(repoId, keyword, { maxResults = 50 } = {}) {
  const root = await getRepoLocalPath(repoId);
  if (!root) throw createHttpError(404, "Repo not found");

  const q = String(keyword || "").trim();
  if (!q) throw createHttpError(400, "keyword is required");

  const results = [];
  await walk(root, "");
  return results.slice(0, maxResults);

  async function walk(absDir, relDir) {
    if (shouldIgnorePath(relDir || ".")) return;
    const entries = fs.readdirSync(absDir, { withFileTypes: true });

    for (const entry of entries) {
      const abs = path.join(absDir, entry.name);
      const rel = relDir ? path.join(relDir, entry.name) : entry.name;
      if (shouldIgnorePath(rel)) continue;

      if (entry.isDirectory()) {
        await walk(abs, rel);
        if (results.length >= maxResults) return;
      } else if (entry.isFile()) {
        const stat = fs.statSync(abs);
        if (stat.size > 300_000) continue;
        if (!isTextLikeFile(abs)) continue;

        let content;
        try {
          content = await fs.promises.readFile(abs, "utf8");
        } catch (_err) {
          continue;
        }

        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(q.toLowerCase())) {
            results.push({
              path: rel,
              line: i + 1,
              preview: lines[i].slice(0, 300),
            });
            if (results.length >= maxResults) return;
          }
        }
      }
    }
  }
}

async function getDependencies(repoId) {
  const root = await getRepoLocalPath(repoId);
  if (!root) throw createHttpError(404, "Repo not found");

  const candidates = [
    { type: "node", file: "package.json" },
    { type: "python", file: "requirements.txt" },
    { type: "python", file: "pyproject.toml" },
  ];

  const found = [];
  for (const c of candidates) {
    const abs = path.join(root, c.file);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (!stat.isFile() || stat.size > 500_000) continue;
    const text = await fs.promises.readFile(abs, "utf8");
    found.push({ type: c.type, file: c.file, text });
  }

  // Parse package.json if present
  const pkg = found.find((x) => x.file === "package.json");
  if (pkg) {
    try {
      const json = JSON.parse(pkg.text);
      return {
        kind: "node",
        packageJson: {
          name: json.name || null,
          dependencies: json.dependencies || {},
          devDependencies: json.devDependencies || {},
        },
        rawFiles: found.map(({ type, file }) => ({ type, file })),
      };
    } catch (_err) {
      // fall through to raw
    }
  }

  return {
    kind: "raw",
    rawFiles: found,
  };
}

module.exports = {
  listFiles,
  readFile,
  searchCode,
  getDependencies,
  getFolderStructure,
};

