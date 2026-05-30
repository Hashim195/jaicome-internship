# AI_LOG.md

## Tools Used
- Claude (claude.ai) — used throughout the build for guidance, debugging, and code generation
- Groq API (llama-3.1-8b-instant) — LLM provider for the support agent

## Key Prompts Written

### System Prompt (agent.ts)
The main system prompt instructs the agent to:
- Capture page context (path, title, readable content)
- Differentiate between bug reports and feature requests
- Auto-detect severity from log types (error/5xx = high, warn/4xx = medium)
- Refuse to create tickets from vague one-line messages
- Return structured ticket data using TICKET_READY: prefix

### Bug Flow Prompt Rules
- If logs present: reference them, use to detect severity
- If no logs: ask targeted questions before creating ticket
- Never create bug ticket without repro steps

### Feature Request Flow Rules
- Do not ask about logs
- Collect: what, why, what problem it solves
- Severity always defaults to low

## What Worked
- TICKET_READY: prefix pattern for structured output worked reliably
- @mswjs/interceptors FetchInterceptor caught all failed network requests correctly
- loglevel override pattern for console.error/warn capture worked cleanly
- Groq free tier was fast and reliable for this use case

## What Didn't Work / Limitations
- @mozilla/readability caused request hangs in the browser when page content was large — mitigated by slicing to 500 chars
- Google Gemini free tier had quota issues and model deprecations
- OpenAI required paid credits
- The TICKET_READY: JSON parsing can fail if the model adds extra text — handled with try/catch fallback
- No streaming — responses feel slow on first message due to full round-trip

## Known Improvements
- Add streaming responses for better UX
- Add proper readability content trimming strategy
- Store API keys in a secrets manager rather than .env
- Add retry logic with exponential backoff for LLM failures
