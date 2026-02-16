const express = require("express");
const {
  explainRepoController,
  chatRepoController,
  readmeController,
  suggestionsController,
} = require("../controllers/agentController");

const agentRouter = express.Router();

// Phase 3: Explain repo (requires index)
agentRouter.post("/:repoId/explain", explainRepoController);

// Phase 4: Chat with repo (requires index)
agentRouter.post("/:repoId/chat", chatRepoController);

// Phase 5: Documentation + suggestions (requires index)
agentRouter.post("/:repoId/readme", readmeController);
agentRouter.post("/:repoId/suggestions", suggestionsController);

module.exports = { agentRouter };

