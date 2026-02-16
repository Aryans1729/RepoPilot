const { getDependencies, getFolderStructure, searchCode } = require("./tools");
const { retrieveChunks } = require("../services/retrievalService");
const { generateText } = require("../services/llmService");
const { getIndexStatus } = require("../services/indexingService");
const { createHttpError } = require("../utils/http");

/**
 * Phase 3 "agent-style" loop (deterministic):
 * Goal -> gather repo signals -> retrieve relevant chunks -> synthesize explanation.
 *
 * Later phases can upgrade this to true tool-calling (LLM decides which tools to call).
 */
async function explainRepo({ repoId }) {
  const trace = [];

  // Ensure index exists
  trace.push({ step: "getIndexStatus" });
  const idx = await getIndexStatus(repoId);
  if (idx.status !== "indexed") {
    throw createHttpError(400, "Repo is not indexed yet. Click 'Build index' first.");
  }

  trace.push({ step: "getDependencies" });
  const deps = await getDependencies(repoId);

  trace.push({ step: "getFolderStructure" });
  const structure = await getFolderStructure(repoId);

  trace.push({ step: "searchCode(entrypoints)" });
  const entryHits = await searchCode(repoId, "main", { maxResults: 20 }).catch(() => []);

  trace.push({ step: "retrieveChunks(architecture)" });
  const hits = await retrieveChunks(
    repoId,
    "architecture overview entry points request flow modules services routes controllers database models",
    { topK: 10 }
  );

  const context = buildContext({ deps, structure, entryHits, hits });

  trace.push({ step: "llm(synthesize)" });
  const answer = await generateText({
    system:
      "You are a senior software engineer. Explain the repository architecture clearly and concretely. " +
      "Use the provided repo context only. If information is missing, say so. " +
      "Include a short section 'Key files' with bullet points and file paths.",
    user: context,
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
    trace,
  };
}

function buildContext({ deps, structure, entryHits, hits }) {
  const depSummary =
    deps?.kind === "node"
      ? {
          name: deps.packageJson?.name || null,
          dependencies: Object.keys(deps.packageJson?.dependencies || {}).slice(0, 60),
          devDependencies: Object.keys(deps.packageJson?.devDependencies || {}).slice(0, 60),
        }
      : deps;

  return [
    "## Repo dependencies (parsed)",
    JSON.stringify(depSummary, null, 2),
    "",
    "## Folder structure (tree JSON)",
    JSON.stringify(structure, null, 2).slice(0, 12000),
    "",
    "## Entry-point-ish search results",
    JSON.stringify(entryHits, null, 2),
    "",
    "## Retrieved code chunks (top hits)",
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
  explainRepo,
};

