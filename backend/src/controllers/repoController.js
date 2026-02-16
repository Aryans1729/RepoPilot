const {
  ingestFromGitUrl,
  ingestFromZipUpload,
  getCachedStructure,
} = require("../services/repoIngestionService");
const { indexRepo, getIndexStatus } = require("../services/indexingService");
const { createHttpError } = require("../utils/http");

async function ingestRepo(req, res, next) {
  try {
    const githubUrl = req.body?.githubUrl;
    const zipFile = req.file; // multer

    if (!githubUrl && !zipFile) {
      throw createHttpError(
        400,
        "Provide either JSON body { githubUrl } or a multipart ZIP upload field named 'zip'."
      );
    }

    let result;
    if (githubUrl) {
      result = await ingestFromGitUrl(String(githubUrl));
    } else {
      result = await ingestFromZipUpload({
        uploadedZipPath: zipFile.path,
        originalName: zipFile.originalname,
      });
    }

    res.json({
      repoId: result.repoId,
      structure: result.structure,
    });
  } catch (err) {
    next(err);
  }
}

async function getRepoStructure(req, res, next) {
  try {
    const repoId = String(req.params.repoId);
    const structure = await getCachedStructure(repoId);
    if (!structure) throw createHttpError(404, "Repo not found");
    res.json({ repoId, structure });
  } catch (err) {
    next(err);
  }
}

async function indexRepoController(req, res, next) {
  try {
    const repoId = String(req.params.repoId);
    const status = await indexRepo(repoId);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

async function getIndexStatusController(req, res, next) {
  try {
    const repoId = String(req.params.repoId);
    const status = await getIndexStatus(repoId);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  ingestRepo,
  getRepoStructure,
  indexRepoController,
  getIndexStatusController,
};

