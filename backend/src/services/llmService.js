const OpenAI = require("openai");

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function generateText({ system, user, temperature = 0.2 }) {
  const client = getClient();
  if (!client) {
    const err = new Error("OPENAI_API_KEY is not set");
    err.status = 400;
    throw err;
  }
  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";

  const resp = await client.chat.completions.create({
    model,
    temperature,
    messages: [
      system ? { role: "system", content: system } : null,
      { role: "user", content: user },
    ].filter(Boolean),
  });

  return resp.choices?.[0]?.message?.content || "";
}

module.exports = {
  generateText,
};

