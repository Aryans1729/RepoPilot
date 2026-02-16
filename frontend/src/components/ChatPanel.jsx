import { useMemo, useState } from "react";
import { chatWithRepo } from "../services/api";

export default function ChatPanel({ repoId, disabled }) {
  const [messages, setMessages] = useState(() => []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const history = useMemo(() => {
    // Keep minimal history payload to backend
    return messages.map((m) => ({ role: m.role, content: m.content })).slice(-8);
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError("");
    setBusy(true);
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const resp = await chatWithRepo(repoId, { message: text, history });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: resp.answer || "",
          citations: resp.citations || [],
        },
      ]);
    } catch (e) {
      setError(e.message || "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="chatBox">
        {messages.length === 0 ? (
          <div className="muted">Ask a question about the repo (requires index).</div>
        ) : null}
        {messages.map((m, idx) => (
          <div key={idx} className={`chatMsg ${m.role}`}>
            <div className="chatRole">{m.role}</div>
            <div className="chatContent">{m.content}</div>
            {m.role === "assistant" && m.citations?.length ? (
              <div className="chatCites">
                {m.citations.slice(0, 5).map((c, i) => (
                  <div key={i} className="chatCite">
                    {c.filePath}:{c.startLine}-{c.endLine}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {error ? (
        <div style={{ marginTop: 10, color: "rgba(239,68,68,0.95)" }}>{error}</div>
      ) : null}

      <div className="row" style={{ marginTop: 10 }}>
        <input
          type="text"
          value={input}
          placeholder={disabled ? "Build index to enable chat" : "Ask: How does authentication work?"}
          disabled={disabled || busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button className="btn primary" onClick={send} disabled={disabled || busy}>
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

