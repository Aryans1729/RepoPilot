const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const unzipper = require("unzipper");
const simpleGit = require("simple-git");

const { Repo } = require("../models/Repo");
const { connectMongoIfConfigured } = require("../db/connect");
const { scanRepoStructure } = require("../repo/scanRepo");
const {
  ensureDir,
  safeRm,
  safeWriteJson,
  safeReadJson,
  isPathInside,
} = require("../utils/fs");
const { createHttpError } = require("../utils/http");

const REPOS_DIR = ensureDir(process.env.REPOS_DIR || "repos");

// In-memory index so the app works without Mongo.
// repoId -> { localPath, sourceType, sourceUrl }
const repoIndex = new Map();

function createRepoId() {
  // Short, URL-safe id (12 chars) with enough entropy for local usage.
  return crypto.randomBytes(9).toString("base64url");
}

function repoRoot(repoId) {
  return path.join(REPOS_DIR, repoId);
}

function metaDir(repoId) {
  return path.join(repoRoot(repoId), ".repopilot");
}

function structureCachePath(repoId) {
  return path.join(metaDir(repoId), "structure.json");
}

async function persistRepoMetadata(meta) {
  repoIndex.set(meta.repoId, {
    localPath: meta.localPath,
    sourceType: meta.sourceType,
    sourceUrl: meta.sourceUrl || null,
  });

  // Optional Mongo persistence
  try {
    await connectMongoIfConfigured();
    if (!process.env.MONGODB_URI) return;

    await Repo.updateOne(
      { _id: meta.repoId },
      {
        $set: {
          sourceType: meta.sourceType,
          sourceUrl: meta.sourceUrl || null,
          localPath: meta.localPath,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (_err) {
    // ignore Mongo issues for MVP; in-memory index still works
  }
}

async function getRepoLocalPath(repoId) {
  const indexed = repoIndex.get(repoId);
  if (indexed?.localPath) return indexed.localPath;

  if (process.env.MONGODB_URI) {
    try {
      await connectMongoIfConfigured();
      const doc = await Repo.findById(repoId).lean();
      if (doc?.localPath) return doc.localPath;
    } catch (_err) {
      // ignore
    }
  }

  // Fallback: if folder exists, treat it as ingested
  const p = repoRoot(repoId);
  if (fs.existsSync(p)) return p;
  return null;
}

async function cacheStructure(repoId, structure) {
  ensureDir(metaDir(repoId));
  await safeWriteJson(structureCachePath(repoId), structure);
}

async function getCachedStructure(repoId) {
  const p = structureCachePath(repoId);
  if (fs.existsSync(p)) return safeReadJson(p);
  return null;
}

async function ingestFromGitUrl(githubUrl) {
  const repoId = createRepoId();
  const dest = repoRoot(repoId);

  ensureDir(REPOS_DIR);
  await safeRm(dest);
  ensureDir(dest);

  // Basic validation (kept permissive; git will ultimately validate)
  if (!/^https?:\/\//i.test(githubUrl) && !/^git@/i.test(githubUrl)) {
    throw createHttpError(400, "Invalid GitHub URL");
  }

  const git = simpleGit();
  try {
    await git.clone(githubUrl, dest, ["--depth", "1"]);
  } catch (err) {
    await safeRm(dest);
    throw createHttpError(400, `Failed to clone repo: ${err.message}`);
  }

  const structure = await scanRepoStructure(dest);
  await cacheStructure(repoId, structure);
  await persistRepoMetadata({
    repoId,
    sourceType: "github",
    sourceUrl: githubUrl,
    localPath: dest,
  });

  return { repoId, localPath: dest, structure };
}

async function extractZipToFolder(uploadedZipPath, destFolder) {
  ensureDir(destFolder);

  // unzipper doesn't protect against Zip Slip by default; we validate each entry path.
  await new Promise((resolve, reject) => {
    const stream = fs
      .createReadStream(uploadedZipPath)
      .pipe(unzipper.Parse());

    stream.on("entry", async (entry) => {
      const entryPath = entry.path;
      const type = entry.type; // 'File' | 'Directory'

      const targetPath = path.join(destFolder, entryPath);
      if (!isPathInside(destFolder, targetPath)) {
        entry.autodrain();
        return;
      }

      if (type === "Directory") {
        ensureDir(targetPath);
        entry.autodrain();
        return;
      }

      ensureDir(path.dirname(targetPath));
      entry.pipe(fs.createWriteStream(targetPath));
    });

    stream.on("error", reject);
    stream.on("close", resolve);
    stream.on("finish", resolve);
  });
}

async function normalizeSingleTopFolder(dest) {
  // Many zips contain a single root folder; if so, move its contents up one level.
  const entries = fs
    .readdirSync(dest, { withFileTypes: true })
    .filter((e) => e.name !== ".repopilot");

  if (entries.length !== 1) return;
  if (!entries[0].isDirectory()) return;

  const inner = path.join(dest, entries[0].name);
  const innerEntries = fs.readdirSync(inner);
  for (const name of innerEntries) {
    fs.renameSync(path.join(inner, name), path.join(dest, name));
  }
  fs.rmdirSync(inner);
}

async function ingestFromZipUpload({ uploadedZipPath }) {
  const repoId = createRepoId();
  const dest = repoRoot(repoId);

  ensureDir(REPOS_DIR);
  await safeRm(dest);
  ensureDir(dest);

  try {
    await extractZipToFolder(uploadedZipPath, dest);
    await normalizeSingleTopFolder(dest);
  } catch (err) {
    await safeRm(dest);
    throw createHttpError(400, `Failed to extract ZIP: ${err.message}`);
  } finally {
    await safeRm(uploadedZipPath);
  }

  const structure = await scanRepoStructure(dest);
  await cacheStructure(repoId, structure);
  await persistRepoMetadata({
    repoId,
    sourceType: "zip",
    localPath: dest,
  });

  return { repoId, localPath: dest, structure };
}

module.exports = {
  ingestFromGitUrl,
  ingestFromZipUpload,
  getRepoLocalPath,
  getCachedStructure,
};

