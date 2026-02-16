import { useEffect, useState } from "react";
import TreeView from "../components/TreeView";
import ChatPanel from "../components/ChatPanel";
import {
  buildIndex,
  explainRepo,
  generateReadme,
  generateSuggestions,
  getIndexStatus,
} from "../services/api";

export default function DashboardPage({ repoId, structure, onReset }) {
  const [indexStatus, setIndexStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [arch, setArch] = useState("");
  const [archBusy, setArchBusy] = useState(false);
  const [readme, setReadme] = useState("");
  const [readmeBusy, setReadmeBusy] = useState(false);
  const [suggestions, setSuggestions] = useState("");
  const [suggestBusy, setSuggestBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await getIndexStatus(repoId);
        if (!cancelled) setIndexStatus(s);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load index status");
      }
    }
    load();
    const t = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [repoId]);

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <h1>RepoPilot Dashboard</h1>
          <p>
            Repo: <span className="pill">{repoId}</span>
          </p>
        </div>
        <div className="row">
          <button className="btn danger" onClick={onReset}>
            Analyze another repo
          </button>
        </div>
      </div>

      <div className="grid">
        <div className="panel">
          <h2>Folder Structure</h2>
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="pill">
              Index: {indexStatus?.status || "…"}
              {indexStatus?.totalChunks ? ` • ${indexStatus.totalChunks} chunks` : ""}
            </span>
            <button
              className="btn primary"
              disabled={busy || indexStatus?.status === "indexing"}
              onClick={async () => {
                setError("");
                setBusy(true);
                try {
                  const s = await buildIndex(repoId);
                  setIndexStatus(s);
                } catch (e) {
                  setError(e.message || "Index build failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {indexStatus?.status === "indexed"
                ? "Rebuild index"
                : busy
                ? "Building…"
                : "Build index"}
            </button>
          </div>
          {error ? (
            <div style={{ marginBottom: 10, color: "rgba(239,68,68,0.95)" }}>
              {error}
            </div>
          ) : null}
          {structure ? (
            <TreeView structure={structure} />
          ) : (
            <div className="muted">No structure loaded.</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="panel">
            <h2>Architecture Summary</h2>
            <div className="row" style={{ marginBottom: 10 }}>
              <button
                className="btn primary"
                disabled={archBusy || indexStatus?.status !== "indexed"}
                onClick={async () => {
                  setError("");
                  setArchBusy(true);
                  try {
                    const r = await explainRepo(repoId);
                    setArch(r.answer || "");
                  } catch (e) {
                    setError(e.message || "Failed to generate architecture");
                  } finally {
                    setArchBusy(false);
                  }
                }}
              >
                {archBusy ? "Generating…" : "Generate architecture"}
              </button>
              <span className="pill">
                Requires index
              </span>
            </div>
            {arch ? (
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "rgba(234,240,255,0.92)" }}>
                {arch}
              </div>
            ) : (
              <div className="muted">
                Build the index, then generate an architecture explanation.
              </div>
            )}
          </div>

          <div className="panel">
            <h2>Generated README</h2>
            <div className="row" style={{ marginBottom: 10 }}>
              <button
                className="btn primary"
                disabled={readmeBusy || indexStatus?.status !== "indexed"}
                onClick={async () => {
                  setError("");
                  setReadmeBusy(true);
                  try {
                    const r = await generateReadme(repoId);
                    setReadme(r.readme || "");
                  } catch (e) {
                    setError(e.message || "Failed to generate README");
                  } finally {
                    setReadmeBusy(false);
                  }
                }}
              >
                {readmeBusy ? "Generating…" : "Generate README"}
              </button>
              <span className="pill">Requires index</span>
            </div>
            {readme ? (
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "rgba(234,240,255,0.92)" }}>
                {readme}
              </div>
            ) : (
              <div className="muted">Generate a README.md based on the repo context.</div>
            )}
          </div>

          <div className="panel">
            <h2>Suggestions & Code Smells</h2>
            <div className="row" style={{ marginBottom: 10 }}>
              <button
                className="btn primary"
                disabled={suggestBusy || indexStatus?.status !== "indexed"}
                onClick={async () => {
                  setError("");
                  setSuggestBusy(true);
                  try {
                    const r = await generateSuggestions(repoId);
                    setSuggestions(r.suggestions || "");
                  } catch (e) {
                    setError(e.message || "Failed to generate suggestions");
                  } finally {
                    setSuggestBusy(false);
                  }
                }}
              >
                {suggestBusy ? "Generating…" : "Generate suggestions"}
              </button>
              <span className="pill">Requires index</span>
            </div>
            {suggestions ? (
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "rgba(234,240,255,0.92)" }}>
                {suggestions}
              </div>
            ) : (
              <div className="muted">Get improvement suggestions and potential code smells.</div>
            )}
          </div>

          <div className="panel">
            <h2>Chat with Repo</h2>
            <ChatPanel repoId={repoId} disabled={indexStatus?.status !== "indexed"} />
          </div>
        </div>
      </div>
    </div>
  );
}

