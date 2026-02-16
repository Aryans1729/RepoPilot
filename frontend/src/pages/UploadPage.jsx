import { useMemo, useState } from "react";
import { ingestRepo } from "../services/api";

export default function UploadPage({ onAnalyzed }) {
  const [githubUrl, setGithubUrl] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return (!busy && githubUrl.trim().length > 0) || (!busy && zipFile);
  }, [busy, githubUrl, zipFile]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await ingestRepo({
        githubUrl: githubUrl.trim() ? githubUrl.trim() : null,
        zipFile: zipFile || null,
      });
      onAnalyzed(data);
    } catch (err) {
      setError(err.message || "Failed to analyze repo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <h1>RepoPilot</h1>
          <p>Upload a GitHub URL or ZIP to analyze.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Repo Upload</h2>
        <form onSubmit={onSubmit}>
          <div className="field">
            <div className="muted">GitHub Repo URL</div>
            <input
              type="text"
              placeholder="https://github.com/user/repo"
              value={githubUrl}
              onChange={(e) => {
                setGithubUrl(e.target.value);
                if (e.target.value.trim()) setZipFile(null);
              }}
              disabled={busy}
            />
          </div>

          <div className="divider" />

          <div className="field">
            <div className="muted">Or upload a ZIP</div>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setZipFile(f);
                if (f) setGithubUrl("");
              }}
              disabled={busy}
            />
          </div>

          <div className="row">
            <button className="btn primary" disabled={!canSubmit}>
              {busy ? "Analyzing…" : "Analyze Repo"}
            </button>
            <span className="pill">
              Phase 1: ingest → folder structure
            </span>
          </div>

          {error ? (
            <div style={{ marginTop: 12, color: "rgba(239,68,68,0.95)" }}>
              {error}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

