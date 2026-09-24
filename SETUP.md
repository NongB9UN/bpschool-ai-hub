# BPSchool LINE storage setup

## Current state
- Public dashboard uses bundled sample data, not private LINE messages.
- Server endpoints store messages in Supabase with server-only credentials.
- Reports use Gemini when messages exist. Missing credentials or model errors fail explicitly; there is no silent keyword fallback.
- Cron is intentionally not configured during onboarding. LINE_PUSH_ENABLED defaults to off.

## Server environment (Vercel Production)
- SUPABASE_URL: https://ejhdtdyezcywsierhhfb.supabase.co
- SUPABASE_SECRET_KEY: Supabase secret API key (sb_secret_...), never a publishable key.
- LINE_CHANNEL_SECRET: channel secret from the OA Messaging API channel.
- CRON_SECRET: a random secret used as Authorization: Bearer ... for status and summary.
- LINE_CHANNEL_ACCESS_TOKEN, LINE_TARGET_ID: needed only for sending.
- LINE_PUSH_ENABLED=false until a destination is explicitly approved.

Run supabase/migrations/202609220001_line_storage.sql once. Already applied to project ejhdtdyezcywsierhhfb.

## Gemini preview
Set GEMINI_API_KEY as a server-only Vercel Production secret and GEMINI_MODEL=gemini-3.5-flash-lite (or a supported model available to your Google project). Redeploy after changing environment variables. Preview at /admin.html using CRON_SECRET and a date with stored messages. Each nonempty preview calls Gemini and may incur Google API charges. Keep LINE_PUSH_ENABLED=false during preview. No chat command triggers reports yet.

Gemini receives stored message text, group IDs and timestamps for enabled source groups. Review the preview before activating delivery. API failures return sanitized GEMINI_* error codes; 429 returns GEMINI_RATE_LIMITED. No automatic retries.

## Test ingestion
1. Deploy and configure server environment, then redeploy.
2. Set LINE webhook URL to https://bpschool-ai-hub.vercel.app/api/webhook.
3. Verify the webhook, enable webhooks and redelivery in LINE Developers.
4. Send a harmless test message in the small test group. No response is sent.
5. Inspect line_groups in Supabase and identify the test group ID; set ingest_enabled=true only for that group. Unknown groups retain IDs only, not text.
6. Send another harmless message; verify a line_messages record exists. Retried events must not duplicate it.
7. GET /api/summary?date=YYYY-MM-DD with Authorization header to preview a Bangkok-calendar-day report.

## Sending (separate activation)
Set report_enabled=true for the approved destination, set LINE_TARGET_ID and LINE_CHANNEL_ACCESS_TOKEN, then LINE_PUSH_ENABLED=true. The source group and destination can differ.
A unique date/target claim prevents concurrent/duplicate sends. A timeout or ambiguous result is marked uncertain (or remains sending on process interruption). Do not delete the claim or retry automatically: review LINE delivery before manually recovering. LINE retry keys have a limited validity period.

## Operational limits
- New messages only; text only; DMs ignored. The server does not respond to chat commands yet.
- Only ingest_enabled groups appear in summaries; disabling one excludes its history from reports.
- An unsend clears stored text and leaves a tombstone; it cannot retract reports already delivered or previously persisted summary text. Manual handling of derived reports may be needed.
- AI reports may contain errors and need human review. Max 10,000 messages and 60,000 JSON input characters per report; larger days fail explicitly. Incomplete or overlong model output is rejected before sending.
- No retention/backup schedule or authenticated live dashboard has been implemented yet.
- Scheduled dispatch is disabled pending a successful manual test. Vercel Hobby scheduling is not minute-precise.

## Validation
node --test
node scripts/build.js
Only index.html, css/, js/ are copied into public/. Database SQL, server helpers and tests are not static web assets.
