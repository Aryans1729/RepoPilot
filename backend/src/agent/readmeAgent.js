const { getDependencies, getFolderStructure, searchCode } = require("./tools");
const { retrieveChunks } = require("../services/retrievalService");
const { generateText } = require("../services/llmService");
const { getIndexStatus } = require("../services/indexingService");
const { createHttpError } = require("../utils/http");

async function generateReadme({ repoId }) {
  const idx = await getIndexStatus(repoId);
  if (idx.status !== "indexed") {
    throw createHttpError(400, "Repo is not indexed yet. Click 'Build index' first.");
  }

  const deps = await getDependencies(repoId);
  const structure = await getFolderStructure(repoId);

  // Pull in likely run/setup info
  const hits = await retrieveChunks(
    repoId,
    "how to run install setup environment variables scripts build start docker compose",
    { topK: 12 }
  );

  const scriptHits = await searchCode(repoId, "\"scripts\"", { maxResults: 20 }).catch(() => []);

  const prompt = [
    "Generate a high-quality README.md for this repository.",
    "",
    "Hard requirements:",
    "- Use clear sections: Overview, Features, Tech Stack, Project Structure, Setup, Run, API (if applicable), Notes.",
    "- Only claim what is supported by the provided context; if unknown, add a TODO note instead of guessing.",
    "- Use markdown.",
    "",
    "## Dependencies (parsed)",
    JSON.stringify(deps, null, 2),
    "",
    "## Folder structure (tree JSON)",
    JSON.stringify(structure, null, 2).slice(0, 12000),
    "",
    "## Script-ish search results",
    JSON.stringify(scriptHits, null, 2),
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

  const readme = await generateText({
    system: "You are a senior engineer writing excellent repository documentation.",
    user: prompt,
    temperature: 0.2,
  });

  return {
    repoId,
    readme,
    citations: hits.map((h) => ({
      filePath: h.filePath,
      startLine: h.startLine,
      endLine: h.endLine,
      score: h.score,
    })),
  };
}

module.exports = {
  generateReadme,
};

