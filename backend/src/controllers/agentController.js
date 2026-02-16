const { explainRepo } = require("../agent/explainRepoAgent");
const { chatWithRepo } = require("../agent/chatRepoAgent");
const { generateReadme } = require("../agent/readmeAgent");
const { generateSuggestions } = require("../agent/suggestionsAgent");

async function explainRepoController(req, res, next) {
  try {
    const repoId = String(req.params.repoId);
    const result = await explainRepo({ repoId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  explainRepoController,
  chatRepoController,
  readmeController,
  suggestionsController,
};

async function chatRepoController(req, res, next) {
  try {
    const repoId = String(req.params.repoId);
    const message = String(req.body?.message || "").trim();
    const history = req.body?.history || [];
    if (!message) {
      const err = new Error("message is required");
      err.status = 400;
      throw err;
    }
    const result = await chatWithRepo({ repoId, message, history });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function readmeController(req, res, next) {
  try {
    const repoId = String(req.params.repoId);
    const result = await generateReadme({ repoId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function suggestionsController(req, res, next) {
  try {
    const repoId = String(req.params.repoId);
    const result = await generateSuggestions({ repoId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

