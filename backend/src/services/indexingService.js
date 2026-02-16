const fs = require("fs");
const path = require("path");

const { getRepoLocalPath } = require("./repoIngestionService");
const { collectTextFiles } = require("../repo/collectTextFiles");
const { chunkTextByLines, makeChunkId } = require("../repo/chunking");
const { embedTexts } = require("./embeddingsService");
const { upsertChunks, loadRepoVectors } = require("../vector/localVectorStore");
const { ensureDir, safeWriteJson, safeReadJson } = require("../utils/fs");
const { createHttpError } = require("../utils/http");

function statusPath(repoRootAbsPath) {
  const meta = path.join(repoRootAbsPath, ".repopilot");
  ensureDir(meta);
  return path.join(meta, "indexStatus.json");
}

async function getIndexStatus(repoId) {
  const root = await getRepoLocalPath(repoId);
  if (!root) throw createHttpError(404, "Repo not found");
  const p = statusPath(root);
  if (!fs.existsSync(p)) {
    const vectors = await loadRepoVectors(repoId);
    return {
      repoId,
      status: vectors.chunks?.length ? "indexed" : "not_indexed",
      chunks: vectors.chunks?.length || 0,
    };
  }
  return safeReadJson(p);
}

async function writeStatus(repoRootAbsPath, statusObj) {
  await safeWriteJson(statusPath(repoRootAbsPath), statusObj);
}

/**
 * Build a local vector index for a repo:
 * - collect text files
 * - chunk into ~800 token windows with overlap
 * - embed each chunk
 * - upsert into local vector store JSON
 */
async function indexRepo(repoId, opts = {}) {
  const root = await getRepoLocalPath(repoId);
  if (!root) throw createHttpError(404, "Repo not found");

  const {
    targetTokens = 800,
    overlapTokens = 120,
    maxFiles = 800,
    embedBatchSize = 64,
  } = opts;

  const startedAt = new Date().toISOString();
  await writeStatus(root, {
    repoId,
    status: "indexing",
    startedAt,
    processedFiles: 0,
    processedChunks: 0,
    totalFiles: 0,
  });

  const files = await collectTextFiles(root);
  const selected = files.slice(0, maxFiles);

  await writeStatus(root, {
    repoId,
    status: "indexing",
    startedAt,
    processedFiles: 0,
    processedChunks: 0,
    totalFiles: selected.length,
  });

  // Build chunk records
  const chunkRecords = [];
  for (let idx = 0; idx < selected.length; idx++) {
    const f = selected[idx];
    const text = await fs.promises.readFile(f.absPath, "utf8").catch(() => null);
    if (!text) continue;
    const chunks = chunkTextByLines(text, { targetTokens, overlapTokens });
    for (const ch of chunks) {
      chunkRecords.push({
        filePath: f.relPath,
        startLine: ch.startLine,
        endLine: ch.endLine,
        text: ch.text,
      });
    }

    if ((idx + 1) % 25 === 0) {
      await writeStatus(root, {
        repoId,
        status: "indexing",
        startedAt,
        processedFiles: idx + 1,
        processedChunks: chunkRecords.length,
        totalFiles: selected.length,
      });
    }
  }

  // Embed in batches (kept sequential for CommonJS compatibility + API safety)
  const enriched = [];

  for (let i = 0; i < chunkRecords.length; i += embedBatchSize) {
    const batch = chunkRecords.slice(i, i + embedBatchSize);
    // embedTexts can take an array
    const embeddings = await embedTexts(batch.map((b) => b.text));
    for (let j = 0; j < batch.length; j++) {
      const b = batch[j];
      enriched.push({
        chunkId: makeChunkId(repoId, b.filePath, b.startLine, b.endLine),
        repoId,
        filePath: b.filePath,
        startLine: b.startLine,
        endLine: b.endLine,
        text: b.text,
        embedding: embeddings[j],
      });
    }

    if ((i + embedBatchSize) % (embedBatchSize * 5) === 0) {
      await writeStatus(root, {
        repoId,
        status: "indexing",
        startedAt,
        processedFiles: selected.length,
        processedChunks: Math.min(i + embedBatchSize, chunkRecords.length),
        totalFiles: selected.length,
        totalChunks: chunkRecords.length,
      });
    }
  }

  const upserted = await upsertChunks(repoId, enriched);

  const finishedAt = new Date().toISOString();
  const status = {
    repoId,
    status: "indexed",
    startedAt,
    finishedAt,
    totalFiles: selected.length,
    totalChunks: chunkRecords.length,
    storedChunks: upserted.total,
  };
  await writeStatus(root, status);
  return status;
}

module.exports = {
  indexRepo,
  getIndexStatus,
};

