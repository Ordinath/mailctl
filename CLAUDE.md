# mailctl

Lightweight Node.js CLI for IMAP/SMTP email operations. Used by NanoClaw agents to poll, read, send, and manage email from the command line.

## Tech Stack

- TypeScript compiled to JS (`npm run build`)
- `imapflow` — IMAP client (reading inbox, fetching emails)
- `nodemailer` — SMTP client (sending emails)
- `mailparser` — email parsing (headers, body, attachments)
- `commander` — CLI argument parsing
- `dotenv` — config loading

## Project Structure

```
src/
├── index.ts          # CLI entry point (commander setup)
├── config.ts         # Config loading (.env + env vars)
├── imap.ts           # IMAP client wrapper (connect/disconnect per command)
├── smtp.ts           # SMTP client wrapper (nodemailer transport)
├── formatter.ts      # Output formatting (human-readable tables + JSON types)
├── cursor.ts         # Poll cursor file management (read/write UID)
├── utils.ts          # Utilities (date parsing, stdin reading, address formatting)
└── commands/
    ├── inbox.ts      # List recent inbox messages
    ├── read.ts       # Read single email by UID
    ├── send.ts       # Send email via SMTP
    ├── reply.ts      # Reply to email (sets In-Reply-To/References)
    ├── draft.ts      # Save draft via IMAP APPEND
    ├── poll.ts       # Check for new emails using cursor tracking
    ├── folders.ts    # List IMAP folders
    ├── mark.ts       # Set/unset email flags
    └── search.ts     # Search emails with filters
```

## Configuration

Config is loaded from `~/.config/mailctl/.env` (or `$MAILCTL_CONFIG_DIR/.env`), then falls back to CWD `.env`. See `.env.example` for all options.

Required env vars for IMAP: `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS`
Required env vars for SMTP: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

## Build & Run

```bash
npm install
npm run build
node dist/index.js --help    # or npm link to use `mailctl` globally
```

## Commands

- `mailctl inbox` — list inbox (--limit, --unread, --since, --json)
- `mailctl read <uid>` — read email (--json, --raw, --mark-read)
- `mailctl send` — send email (--to, --subject, --body, --cc, --bcc, --attach, --dry-run)
- `mailctl reply <uid>` — reply (--body, --all, --attach)
- `mailctl draft` — save draft (same opts as send)
- `mailctl poll` — check new since last poll (--since, --cursor-file, --json). Exit 0=new, 1=none
- `mailctl folders` — list IMAP folders (--json)
- `mailctl mark <uid>` — set flags (--read, --unread, --flagged, --unflagged, --deleted)
- `mailctl search` — search (--from, --subject, --body, --since, --before, --limit, --json)

## Conventions

- All output defaults to human-readable; use `--json` for machine consumption
- IMAP connections open/close per command (no persistent connection)
- Non-zero exit codes on failure
- The `poll` command uses a cursor file to track last-seen UID
- No tests yet — will add later
