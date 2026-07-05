# Web Research Agent

> AI-powered web research assistant that searches the web, reads multiple sources, and synthesizes comprehensive research reports with citations.

Built as a practical implementation of the **"Research Agent"** pattern from *Mastering AI Agents* by Marcus Lighthaven — Chapter 2 (Building Blocks), Chapter 6 (Tool Integration), and Chapter 8 (Advanced Applications).

## How It Works

The agent follows a **3-phase pipeline**:

1. **Web Search** — Queries Tavily for 8 relevant sources
2. **Deep Reading** — Fetches and extracts text from the top 4 pages using Cheerio
3. **LLM Synthesis** — Sends gathered content to OpenAI with a research analyst prompt, producing a structured Markdown report with `[Source N]` citations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | SQLite via Prisma ORM |
| Web Search | [Tavily](https://tavily.com) |
| Page Reading | [Cheerio](https://cheerio.js.org) |
| LLM | [OpenAI](https://platform.openai.com) (any compatible endpoint) |

## Prerequisites

- **Node.js** 18.17+ or Bun
- **OpenAI API key** — [get one here](https://platform.openai.com/api-keys) (~$0.01/research)
- **Tavily API key** — [get one here](https://tavily.com) (free: 1,000 calls/month)

## Quick Start

```bash
# 1. Clone your repo
git clone https://github.com/YOUR_USERNAME/web-research-agent.git
cd web-research-agent

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Initialize the database
npx prisma db push

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start researching!

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | Your OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model to use (`gpt-4o-mini`, `gpt-4o`, etc.) |
| `OPENAI_BASE_URL` | No | OpenAI default | Use for OpenRouter, Together, Groq, etc. |
| `TAVILY_API_KEY` | Yes | — | Your Tavily API key |
| `DATABASE_URL` | No | `file:./db/research.db` | SQLite database path |

### Using Alternative LLM Providers

The app supports any OpenAI-compatible API. Just set `OPENAI_BASE_URL`:

```env
# OpenRouter
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-your-key

# Together AI
OPENAI_BASE_URL=https://api.together.xyz/v1
OPENAI_API_KEY=your-key

# Groq
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=your-key
OPENAI_MODEL=llama-3.3-70b-versatile
```

## Deploy to Vercel (Recommended)

Since this is a Next.js app with API routes, **Vercel** is the easiest deployment:

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Web Research Agent"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/web-research-agent.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"** → Import your `web-research-agent` repo
3. Vercel auto-detects Next.js — click **Deploy**
4. Add environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`
   - `TAVILY_API_KEY`
   - `OPENAI_MODEL` (optional)
5. Redeploy after adding env vars

### 3. Database on Vercel

For Vercel production, switch to **Turso** (free SQLite cloud):

```env
DATABASE_URL=libsql://your-db-name-your-org.turso.io
```

Or use Vercel Postgres:

```env
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
```

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // or "libsql" for Turso
  url      = env("DATABASE_URL")
}
```

## Deploy to Other Platforms

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t web-research-agent .
docker run -p 3000:3000 --env-file .env.local web-research-agent
```

### Railway / Render / Fly.io

All support Next.js natively. Just:
1. Connect your GitHub repo
2. Add environment variables
3. Deploy

## Project Structure

```
web-research-agent/
├── prisma/
│   └── schema.prisma      # Database schema (Research model)
├── public/                 # Static assets
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── research/
│   │   │   │   ├── route.ts          # POST: main research pipeline
│   │   │   │   └── history/route.ts  # GET/DELETE: research history
│   │   │   └── health/route.ts       # Health check
│   │   ├── globals.css               # Tailwind + theme
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Main UI
│   ├── components/ui/                 # shadcn/ui components
│   ├── hooks/
│   │   └── use-toast.ts
│   └── lib/
│       ├── db.ts                      # Prisma client
│       └── utils.ts                   # cn() helper
├── .env.example                       # Environment template
├── .gitignore
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/research` | Run a research query (body: `{ query: string }`) |
| `GET` | `/api/research/history` | Get recent research history |
| `DELETE` | `/api/research/history` | Delete a research entry (body: `{ id: string }`) |
| `GET` | `/api/health` | Health check |

## Cost Estimate

| API | Per Research | Free Tier |
|-----|-------------|-----------|
| Tavily | ~1 call | 1,000 calls/month |
| OpenAI (gpt-4o-mini) | ~$0.005 | Varies by plan |
| **Total per research** | **~$0.01** | |

## License

MIT

## Acknowledgments

- *Mastering AI Agents* by Marcus Lighthaven — the conceptual foundation for this agent's architecture
- [Tavily](https://tavily.com) — AI search API
- [shadcn/ui](https://ui.shadcn.com) — UI component library