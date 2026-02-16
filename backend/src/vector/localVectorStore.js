const fs = require("fs");
const path = require("path");

const { ensureDir, safeReadJson, safeWriteJson } = require("../utils/fs");

function vectorsDirAbs() {
  const rel = process.env.VECTORS_DIR || ".cache/vectors";
  return ensureDir(rel);
}

function repoVectorPath(repoId) {
  return path.join(vectorsDirAbs(), `${repoId}.json`);
}

async function loadRepoVectors(repoId) {
  const p = repoVectorPath(repoId);
  if (!fs.existsSync(p)) {
    return { repoId, createdAt: new Date().toISOString(), chunks: [] };
  }
  return safeReadJson(p);
}

async function saveRepoVectors(repoId, doc) {
  const p = repoVectorPath(repoId);
  await safeWriteJson(p, doc);
}

/**
 * Upsert by chunkId.
 * doc shape: { repoId, createdAt, updatedAt, chunks: [{chunkId,filePath,startLine,endLine,text,embedding}] }
 */
async function upsertChunks(repoId, chunks) {
  const doc = await loadRepoVectors(repoId);
  const map = new Map(doc.chunks.map((c) => [c.chunkId, c]));
  for (const c of chunks) map.set(c.chunkId, c);
  doc.chunks = Array.from(map.values());
  doc.updatedAt = new Date().toISOString();
  await saveRepoVectors(repoId, doc);
  return { upserted: chunks.length, total: doc.chunks.length };
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function similaritySearch(repoId, queryEmbedding, { topK = 8 } = {}) {
  const doc = await loadRepoVectors(repoId);
  const scored = [];
  for (const c of doc.chunks) {
    if (!Array.isArray(c.embedding)) continue;
    const score = cosineSimilarity(queryEmbedding, c.embedding);
    scored.push({ score, chunk: c });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, topK).map((x) => ({
    score: x.score,
    chunkId: x.chunk.chunkId,
    filePath: x.chunk.filePath,
    startLine: x.chunk.startLine,
    endLine: x.chunk.endLine,
    text: x.chunk.text,
  }));
}

module.exports = {
  loadRepoVectors,
  upsertChunks,
  similaritySearch,
};

