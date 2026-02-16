const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";

async function http(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function ingestRepo({ githubUrl, zipFile }) {
  if (githubUrl) {
    return http("/api/repos/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl }),
    });
  }

  const form = new FormData();
  form.append("zip", zipFile);
  return http("/api/repos/ingest", { method: "POST", body: form });
}

export async function getStructure(repoId) {
  return http(`/api/repos/${encodeURIComponent(repoId)}/structure`);
}

export async function getIndexStatus(repoId) {
  return http(`/api/repos/${encodeURIComponent(repoId)}/index/status`);
}

export async function buildIndex(repoId) {
  return http(`/api/repos/${encodeURIComponent(repoId)}/index`, {
    method: "POST",
  });
}

export async function explainRepo(repoId) {
  return http(`/api/agent/${encodeURIComponent(repoId)}/explain`, {
    method: "POST",
  });
}

export async function chatWithRepo(repoId, { message, history }) {
  return http(`/api/agent/${encodeURIComponent(repoId)}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
}

export async function generateReadme(repoId) {
  return http(`/api/agent/${encodeURIComponent(repoId)}/readme`, {
    method: "POST",
  });
}

export async function generateSuggestions(repoId) {
  return http(`/api/agent/${encodeURIComponent(repoId)}/suggestions`, {
    method: "POST",
  });
}

