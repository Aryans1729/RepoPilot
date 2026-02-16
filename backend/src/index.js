require("dotenv").config();

const { createApp } = require("./app");
const { connectMongoIfConfigured } = require("./db/connect");

async function main() {
  // Optional: backend should still boot if Mongo isn't available.
  await connectMongoIfConfigured();

  const app = createApp();
  const port = Number(process.env.PORT || 5050);

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[backend] fatal error", err);
  process.exit(1);
});

