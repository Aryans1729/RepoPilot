const mongoose = require("mongoose");

const RepoSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // repoId
    sourceType: { type: String, enum: ["github", "zip"], required: true },
    sourceUrl: { type: String, default: null },
    localPath: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const Repo = mongoose.models.Repo || mongoose.model("Repo", RepoSchema);

module.exports = { Repo };

