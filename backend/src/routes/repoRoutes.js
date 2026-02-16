const express = require("express");
const multer = require("multer");

const {
  ingestRepo,
  getRepoStructure,
  indexRepoController,
  getIndexStatusController,
} = require("../controllers/repoController");
const { ensureDir } = require("../utils/fs");

const repoRouter = express.Router();

// Upload ZIPs into TMP_DIR
const tmpDir = ensureDir(process.env.TMP_DIR || "tmp");
const upload = multer({ dest: tmpDir });

// Phase 1: ingest repo (GitHub URL or ZIP)
repoRouter.post("/ingest", upload.single("zip"), ingestRepo);
repoRouter.get("/:repoId/structure", getRepoStructure);

// Phase 2: build local vector index
repoRouter.post("/:repoId/index", indexRepoController);
repoRouter.get("/:repoId/index/status", getIndexStatusController);

module.exports = { repoRouter };

