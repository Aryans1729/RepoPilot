const { retrieveChunks } = require("../services/retrievalService");
const { generateText } = require("../services/llmService");
const { getIndexStatus } = require("../services/indexingService");
const { createHttpError } = require("../utils/http");

/**
 * Phase 4: repo Q&A chat (RAG).
 * Input: user question + optional short history.
 * Output: answer + citations (file/line ranges for retrieved chunks).
 */
async function chatWithRepo({ repoId, message, history = [] }) {
  const idx = await getIndexStatus(repoId);
  if (idx.status !== "indexed") {
    throw createHttpError(400, "Repo is not indexed yet. Click 'Build index' first.");
  }

  const hits = await retrieveChunks(repoId, message, { topK: 8 });

  const userPrompt = buildPrompt({ message, history, hits });
  const answer = await generateText({
    system:
      "You are a helpful repository dev assistant. Answer using the retrieved repo context. " +
      "If you are uncertain, say what to inspect next (specific files/folders). " +
      "Prefer concrete file paths and actionable guidance.",
    user: userPrompt,
    temperature: 0.2,
  });

  return {
    repoId,
    answer,
    citations: hits.map((h) => ({
      filePath: h.filePath,
      startLine: h.startLine,
      endLine: h.endLine,
      score: h.score,
    })),
  };
}

function buildPrompt({ message, history, hits }) {
  const clippedHistory = Array.isArray(history) ? history.slice(-8) : [];
  return [
    "## User question",
    message,
    "",
    "## Conversation history (most recent last)",
    JSON.stringify(clippedHistory, null, 2),
    "",
    "## Retrieved chunks (use as grounding / citations)",
    hits
      .map(
        (h, i) =>
          `### Hit ${i + 1} (${h.filePath}:${h.startLine}-${h.endLine}, score=${h.score.toFixed(
            3
          )})\n${h.text}`
      )
      .join("\n\n"),
  ].join("\n");
}

module.exports = {
  chatWithRepo,
};

