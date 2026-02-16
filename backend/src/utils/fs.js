const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  const abs = path.isAbsolute(dirPath) ? dirPath : path.join(process.cwd(), dirPath);
  fs.mkdirSync(abs, { recursive: true });
  return abs;
}

async function safeRm(targetPath) {
  if (!targetPath) return;
  if (!fs.existsSync(targetPath)) return;
  await fs.promises.rm(targetPath, { recursive: true, force: true });
}

async function safeWriteJson(filePath, obj) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(obj, null, 2), "utf8");
}

async function safeReadJson(filePath) {
  const raw = await fs.promises.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function isPathInside(rootAbs, candidateAbs) {
  const root = path.resolve(rootAbs) + path.sep;
  const cand = path.resolve(candidateAbs);
  return cand === path.resolve(rootAbs) || cand.startsWith(root);
}

module.exports = {
  ensureDir,
  safeRm,
  safeWriteJson,
  safeReadJson,
  isPathInside,
};

