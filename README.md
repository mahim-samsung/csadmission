# CS Admission Intelligence

An AI-powered platform for crawling and analysing CS graduate admissions data, powered by a local Ollama LLM and a modular MCP-style server architecture.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| API | tRPC 11 + React Query 5 |
| ORM | Prisma 5 |
| Database | PostgreSQL |
| LLM | Ollama (local) |
| Serialisation | SuperJSON |
| Validation | Zod |

---

## Project Structure

```
.
├── app/                        # Next.js App Router
│   ├── api/trpc/[trpc]/        # tRPC HTTP handler
│   ├── layout.tsx              # Root layout + providers
│   ├── page.tsx                # Home page
│   ├── error.tsx               # Route error boundary
│   ├── loading.tsx             # Route loading fallback
│   └── providers.tsx           # tRPC + React Query client provider
│
├── components/
│   ├── layout/Header.tsx       # Site navigation header
│   └── ui/                     # Reusable UI primitives
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── ErrorBoundary.tsx
│       └── Spinner.tsx
│
├── server/
│   ├── api/                    # tRPC routers
│   │   ├── trpc.ts             # tRPC init, context, procedures
│   │   ├── root.ts             # Root router (merges all sub-routers)
│   │   └── routers/
│   │       ├── agent.ts        # Chat session + message endpoints
│   │       ├── crawler.ts      # Crawl job endpoints
│   │       └── university.ts   # University CRUD endpoints
│   │
│   ├── db/index.ts             # Prisma client singleton
│   │
│   ├── agents/index.ts         # ReAct agent loop (Ollama)
│   │
│   ├── mcp/
│   │   ├── models/index.ts     # LLM abstraction (generate / chat)
│   │   ├── tools/index.ts      # Tool registry + executor
│   │   └── policies/index.ts   # Policy chain (allow/deny)
│   │
│   ├── scraper/index.ts        # HTML scraper (stub)
│   ├── crawler/index.ts        # BFS crawler (stub)
│   └── jobs/index.ts           # In-process job poller
│
├── lib/
│   ├── env.ts                  # Zod-validated environment config
│   ├── logger.ts               # Namespaced, levelled logger
│   ├── utils.ts                # cn, sleep, retry, chunk…
│   └── trpc/
│       ├── client.ts           # createTRPCReact (client-side)
│       ├── server.ts           # Server-component caller
│       └── query-client.ts     # QueryClient factory
│
├── types/index.ts              # Shared domain types
│
├── prisma/
│   └── schema.prisma           # Database schema
│
├── .env.example                # Environment variable template
└── .env.local                  # Local environment (git-ignored)
```

---

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 15+
- **Ollama** (for local AI)

---

## 1. PostgreSQL Setup

### macOS (Homebrew)

```bash
brew install postgresql@15
brew services start postgresql@15

# Create the database and user
psql postgres
```

Inside psql:

```sql
CREATE USER cs_user WITH PASSWORD 'yourpassword';
CREATE DATABASE cs_admission OWNER cs_user;
GRANT ALL PRIVILEGES ON DATABASE cs_admission TO cs_user;
\q
```

Update your `.env.local`:

```env
DATABASE_URL="postgresql://cs_user:yourpassword@localhost:5432/cs_admission"
```

### Docker (alternative)

```bash
docker run -d \
  --name cs-postgres \
  -e POSTGRES_USER=cs_user \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=cs_admission \
  -p 5432:5432 \
  postgres:15
```

---

## 2. Prisma Migration

```bash
# Generate the Prisma client from schema.prisma
npm run db:generate

# Create and apply the initial migration
npm run db:migrate
# Enter a migration name when prompted, e.g.: "init"

# (Optional) Open Prisma Studio
npm run db:studio
```

For production deployments:

```bash
npm run db:migrate:prod
```

---

## 3. Ollama Setup

### Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### Pull the model

```bash
ollama pull llama3:8b
```

### Start the Ollama server

```bash
ollama serve
# Listening on http://localhost:11434
```

Verify it works:

```bash
curl http://localhost:11434/api/tags
```

To use a different model, update `.env.local`:

```env
OLLAMA_MODEL="mistral:7b"
```

---

## 4. Running the Dev Server

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your values

# Generate Prisma client
npm run db:generate

# Run the database migration
npm run db:migrate

# Start Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 5. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `llama3:8b` | Model name to use for generation |
| `CRAWL_MAX_DEPTH` | `2` | Maximum crawl depth per job |
| `CRAWL_MAX_PAGES` | `12` | Maximum pages per crawl job |
| `NODE_ENV` | `development` | Node environment |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL |
| `LOG_LEVEL` | `info` | Log verbosity: debug / info / warn / error |

---

## 6. Available Scripts

```bash
npm run dev             # Start dev server
npm run build           # Production build
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript compiler (no emit)
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Create + apply migration (dev)
npm run db:migrate:prod # Apply pending migrations (production)
npm run db:studio       # Open Prisma Studio
```

---

## Architecture Notes

### MCP-style separation

The `server/mcp/` directory models the **Model-Context-Policy** pattern:

- **`models/`** — LLM abstraction. Currently wraps Ollama. Swap for OpenAI/Anthropic by implementing the same `generate` / `chat` interface.
- **`tools/`** — Self-describing, typed tools the agent can call. Register new tools with `registerTool()`.
- **`policies/`** — Policy chain evaluated before any tool execution. Add rate-limiting, content filtering, or audit hooks by calling `registerPolicy()`.

### tRPC context

Every tRPC procedure receives `ctx.db` — the Prisma client. A `protectedProcedure` stub is in place; wire it to your auth provider (NextAuth, Clerk, etc.) when needed.

### Error handling

- **Route errors** — `app/error.tsx` catches all errors thrown in Server Components within the route segment.
- **Component errors** — `components/ui/ErrorBoundary.tsx` provides a class-based boundary for client-component subtrees.
- **tRPC errors** — Zod validation errors are flattened and returned as `zodError` in the response `data` shape.

### Crawler / Scraper

Both modules (`server/crawler/`, `server/scraper/`) are typed stubs. The interfaces and job lifecycle (PENDING → RUNNING → DONE/FAILED) are fully wired — only the HTTP fetching and HTML parsing logic needs to be filled in.

---

## Roadmap

- [ ] Implement crawler with `cheerio`
- [ ] Implement scraper with `playwright` for JS-rendered pages
- [ ] Add vector embeddings (pgvector / Qdrant)
- [ ] Build Chat UI with streaming responses
- [ ] Add University and Program list/detail pages
- [ ] Add authentication (Clerk or NextAuth)
- [ ] Replace in-process job poller with BullMQ
