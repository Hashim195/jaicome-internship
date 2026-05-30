# AI Support Agent Widget

A floating customer support agent widget built as part of the Jaicome internship assessment. The agent reads browser console and network logs from the current page, chats with the user to understand their issue, and auto-drafts a support ticket using an LLM.

## Features

- Floating support button embedded in the app
- Silently captures `console.error`, `console.warn`, and failed network requests (4xx/5xx)
- Page context captured via `@mozilla/readability` — sent to the AI on every turn
- Multi-turn AI conversation supporting bug reports and feature requests
- Auto-detects severity from log types (error/5xx = high, warn/4xx = medium)
- Refuses to create a ticket from a vague one-line message
- User reviews and edits all ticket fields before submitting
- Tickets and full conversation history saved to SQLite via Drizzle ORM

## Tech Stack

- **Frontend**: TanStack Start, React, shadcn/ui, Tailwind CSS
- **Backend**: Hono, oRPC (typed end-to-end)
- **Database**: SQLite via Drizzle ORM
- **AI**: Vercel AI SDK + Groq (`llama-3.1-8b-instant`)
- **Log Capture**: `@mswjs/interceptors` (network), `loglevel` (console)
- **Page Context**: `@mozilla/readability`
- **Auth**: Better Auth
- **Monorepo**: Turborepo + Bun

## Setup

### Prerequisites

- [Bun](https://bun.sh) installed
- Groq API key — free at [console.groq.com](https://console.groq.com)

### Install

```bash
bun install
```

### Environment Variables

Create `apps/server/.env`:

```env
DATABASE_URL=file:../../packages/db/sqlite.db
BETTER_AUTH_SECRET=your-secret-minimum-32-characters
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
NODE_ENV=development
GROQ_API_KEY=your-groq-api-key
```

Create `apps/web/.env`:

```env
VITE_SERVER_URL=http://localhost:3000
```

### Database

```bash
bun run db:push
```

### Run

```bash
bun run dev
```

- Web app: [http://localhost:3001](http://localhost:3001)
- API server: [http://localhost:3000](http://localhost:3000)

## How It Works

1. Open the app — the logger silently captures all `console.error`/`console.warn` calls and failed fetch requests in the background
2. Click the **?** button (bottom-right corner) to open the support widget
3. Tell the agent your issue — it asks clarifying questions before drafting anything
4. The agent combines your conversation + captured logs + page context to draft a structured ticket
5. Review and edit the ticket fields (title, description, severity, repro steps)
6. Submit — the ticket and full conversation are saved to SQLite

## Dummy App

The main dashboard intentionally produces real browser errors for the agent to read:

- **Process Payments** — triggers `console.error` (payment gateway timeout)
- **Generate Report** — triggers a failed network request (404)
- **Sync Now** — triggers another failed network request (404)
- **Page load** — triggers `console.warn` (missing `API_KEY` config value)

All errors are user-triggered, not thrown automatically on page load.

## Screenshots

### Chat Flow
![Chat](screenshots/chat.png)

### Ticket Review
![Review](screenshots/review.png)

## Project Structure

```
jaicome-internship/
├── apps/
│   ├── web/         # Frontend (React + TanStack Start)
│   └── server/      # Backend API (Hono + oRPC + agent)
├── packages/
│   ├── ui/          # Shared shadcn/ui components
│   ├── api/         # oRPC routers and procedures
│   ├── auth/        # Better Auth configuration
│   └── db/          # Drizzle schema and migrations
```
