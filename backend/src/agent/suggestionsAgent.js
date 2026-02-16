const { getDependencies, searchCode } = require("./tools");
const { retrieveChunks } = require("../services/retrievalService");
const { generateText } = require("../services/llmService");
const { getIndexStatus } = require("../services/indexingService");
const { createHttpError } = require("../utils/http");

async function generateSuggestions({ repoId }) {
  const idx = await getIndexStatus(repoId);
  if (idx.status !== "indexed") {
    throw createHttpError(400, "Repo is not indexed yet. Click 'Build index' first.");
  }

  const deps = await getDependencies(repoId);

  // Lightweight smell heuristics (fast signal)
  const smells = await collectSmells(repoId);

  // Grounding chunks for broader suggestions
  const hits = await retrieveChunks(
    repoId,
    "improve code quality refactor performance security bugs error handling validation tests logging configuration",
    { topK: 12 }
  );

  const prompt = [
    "You are reviewing a repository. Produce actionable improvement suggestions and potential code smells/bugs.",
    "",
    "Output format (markdown):",
    "## High-impact improvements (5-10 bullets)",
    "## Potential bugs / risks (bullets)",
    "## Code smells detected (grouped by smell type; include file paths/lines when available)",
    "## Quick wins (bullets)",
    "",
    "Only use evidence from the provided context and smell scan. If uncertain, flag as 'needs verification'.",
    "",
    "## Dependencies (parsed)",
    JSON.stringify(deps, null, 2),
    "",
    "## Smell scan results",
    JSON.stringify(smells, null, 2),
    "",
    "## Retrieved chunks",
    hits
      .map(
        (h, i) =>
          `### Hit ${i + 1} (${h.filePath}:${h.startLine}-${h.endLine}, score=${h.score.toFixed(
            3
          )})\n${h.text}`
      )
      .join("\n\n"),
  ].join("\n");

  const suggestions = await generateText({
    system: "You are a meticulous senior engineer doing a repo review.",
    user: prompt,
    temperature: 0.2,
  });

  return {
    repoId,
    suggestions,
    smells,
    citations: hits.map((h) => ({
      filePath: h.filePath,
      startLine: h.startLine,
      endLine: h.endLine,
      score: h.score,
    })),
  };
}

async function collectSmells(repoId) {
  const patterns = [
    { name: "TODO/FIXME", q: "TODO" },
    { name: "TODO/FIXME", q: "FIXME" },
    { name: "debug logging", q: "console.log" },
    { name: "debug logging", q: "print(" },
    { name: "unsafe eval", q: "eval(" },
    { name: "any typescript", q: ": any" },
    { name: "weak equality", q: "==" },
    { name: "hardcoded secrets hint", q: "api_key" },
    { name: "hardcoded secrets hint", q: "secret" },
    { name: "hardcoded secrets hint", q: "token" },
  ];

  const grouped = {};
  for (const p of patterns) {
    // Keep each search shallow to avoid huge payloads
    const hits = await searchCode(repoId, p.q, { maxResults: 20 }).catch(() => []);
    if (!hits.length) continue;
    grouped[p.name] = (grouped[p.name] || []).concat(hits);
  }

  return grouped;
}

module.exports = {
  generateSuggestions,
};

