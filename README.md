# RepoPilot — AI GitHub Repository Dev Assistant

RepoPilot is a full-stack app that ingests a GitHub repository (URL or ZIP), scans it, and enables an AI agent to answer questions and generate repo-level documentation using retrieval-augmented generation (RAG).

This project is being built in **phases** (MVP-first). Phase 1 is fully wired: **repo ingest → folder structure → UI display**.

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

## Next phases (already scaffolded)

- Chunking + embeddings + local vector store
- Retrieval search
- Agent loop with tool calling:
  - `listFiles(repoId, folderPath)`
  - `readFile(repoId, filePath)`
  - `searchCode(repoId, keyword)`
  - `getDependencies(repoId)`
  - `getFolderStructure(repoId)`

## Notes

- To enable indexing/explain/chat, set `OPENAI_API_KEY` in `backend/.env`.
- Indexing uses embeddings; README/suggestions/chat/explain use the chat model.

