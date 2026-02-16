const { embedTexts } = require("./embeddingsService");
const { similaritySearch } = require("../vector/localVectorStore");

async function retrieveChunks(repoId, query, { topK = 10 } = {}) {
  const [embedding] = await embedTexts([query]);
  const hits = await similaritySearch(repoId, embedding, { topK });
  return hits;
}

module.exports = {
  retrieveChunks,
};

