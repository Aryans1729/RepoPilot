# RepoPilot — AI GitHub Repository Dev Assistant

RepoPilot is a full-stack app that ingests a GitHub repository (URL or ZIP), scans it, and enables an AI agent to answer questions and generate repo-level documentation using retrieval-augmented generation (RAG).

This project is being built in **phases** (MVP-first). Phases 1–5 are wired: **ingest → index (chunks+embeddings) → retrieval → explain/chat/readme/suggestions**.

## Monorepo structure

```
/
  backend/   # Node/Express API + repo ingestion + agent tools
  frontend/  # React dashboard UI
```

## Prerequisites

- Node.js 18+ (recommended: 20+)
- npm 9+
- (Optional for metadata) MongoDB running locally or via connection string

## Environment setup

Backend:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set `OPENAI_API_KEY` to enable indexing + agent features.

Frontend:

```bash
cp frontend/.env.example frontend/.env
```

## Install & run (development)

In one terminal:

```bash
cd backend
npm install
npm run dev
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open the frontend dev server URL shown in the terminal (usually `http://localhost:5173`).

## OpenAI setup (required for indexing + agent features)

RepoPilot calls OpenAI for:

- **Embeddings**: building the local index (`POST /api/repos/:repoId/index`)
- **Chat completions**: explain/chat/readme/suggestions (`/api/agent/...`)

### Getting an API key

1. Create/sign in to an OpenAI account.
2. Create an API key in the OpenAI Platform dashboard.
3. Set it in `backend/.env`:

```bash
OPENAI_API_KEY="your_key_here"
```

### Why you might see a 429 “exceeded your current quota”

If you see:

> `429 You exceeded your current quota, please check your plan and billing details`

it usually means your OpenAI project/account has **no available credits** or **billing is not enabled** (it can happen on the *first* request).

Fix:

- Enable billing / add credits in the OpenAI Platform
- Ensure your monthly budget / hard limit is not set to $0
- Verify the API key belongs to the funded project

## API (Phase 1)

- `POST /api/repos/ingest`
  - JSON: `{ "githubUrl": "https://github.com/user/repo" }`
  - OR multipart form-data: `zip=<file>`
  - Returns: `{ repoId, structure }`

- `GET /api/repos/:repoId/structure`
  - Returns: `{ repoId, structure }`

## API (Phase 2–4)

- `POST /api/repos/:repoId/index`
  - Builds local chunk + embedding index (requires `OPENAI_API_KEY`)
  - Returns indexing status JSON

- `GET /api/repos/:repoId/index/status`
  - Returns current indexing status

- `POST /api/agent/:repoId/explain`
  - Generates an architecture explanation (requires index)

- `POST /api/agent/:repoId/chat`
  - Body: `{ "message": "...", "history": [{"role":"user|assistant","content":"..."}] }`
  - Returns: `{ answer, citations }`

- `POST /api/agent/:repoId/readme`
  - Generates a README.md (requires index)

- `POST /api/agent/:repoId/suggestions`
  - Generates improvement suggestions + code smell scan (requires index)

## Full testing flow (UI)

1. Start backend + frontend
2. Upload a GitHub URL or ZIP and click **Analyze Repo**
3. Click **Build index** (requires `OPENAI_API_KEY` + active OpenAI billing/credits)
4. Once indexed, try:
   - **Generate architecture**
   - **Chat with repo**
   - **Generate README**
   - **Generate suggestions**

## Full testing flow (curl)

Ingest ZIP:

```bash
curl -F "zip=@/absolute/path/to/repo.zip" http://localhost:5050/api/repos/ingest
```

Then (replace `REPO_ID`):

```bash
curl -X POST http://localhost:5050/api/repos/REPO_ID/index
curl http://localhost:5050/api/repos/REPO_ID/index/status
curl -X POST http://localhost:5050/api/agent/REPO_ID/explain
curl -X POST http://localhost:5050/api/agent/REPO_ID/readme
curl -X POST http://localhost:5050/api/agent/REPO_ID/suggestions
curl -X POST http://localhost:5050/api/agent/REPO_ID/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are the main modules?", "history":[]}'
```

## Tool functions (agent utilities)

The backend exposes small, safe “tool” functions that agent flows call:

- `listFiles(repoId, folderPath)`
- `readFile(repoId, filePath)`
- `searchCode(repoId, keyword)`
- `getDependencies(repoId)`
- `getFolderStructure(repoId)`

## Notes

- To enable indexing/explain/chat, set `OPENAI_API_KEY` in `backend/.env`.
- Indexing uses embeddings; README/suggestions/chat/explain use the chat model.

