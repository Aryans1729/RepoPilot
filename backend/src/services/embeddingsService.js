const OpenAI = require("openai");

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function embedTexts(texts) {
  const client = getOpenAIClient();
  if (!client) {
    const err = new Error("OPENAI_API_KEY is not set");
    err.status = 400;
    throw err;
  }
  const model = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";

  const resp = await client.embeddings.create({
    model,
    input: texts,
  });

  // resp.data is array aligned to input
  return resp.data.map((d) => d.embedding);
}

module.exports = {
  embedTexts,
};

