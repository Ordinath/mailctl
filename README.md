# mailctl

Lightweight CLI for IMAP/SMTP email operations.

## Setup

```bash
npm install
npm run build
npm link  # optional, makes `mailctl` available globally
```

## Configuration

Create `~/.config/mailctl/.env`:

```env
IMAP_HOST=mail.example.com
IMAP_PORT=993
IMAP_USER=user@example.com
IMAP_PASS=password
IMAP_TLS=true

SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_TLS=true

MAIL_FROM="Display Name <user@example.com>"
```

## Usage

```bash
# List inbox
mailctl inbox
mailctl inbox --unread --since 1h --json

# Read email
mailctl read 12345
mailctl read 12345 --json --mark-read

# Send email
mailctl send --to user@example.com --subject "Hello" --body "Hi there"
echo "Body text" | mailctl send --to user@example.com --subject "Hello"

# Reply
mailctl reply 12345 --body "Thanks!"
mailctl reply 12345 --all --body "Noted"

# Poll for new messages
mailctl poll --since 5m --json

# List folders
mailctl folders

# Mark messages
mailctl mark 12345 --read
mailctl mark 12345 --flagged

# Search
mailctl search --from user@example.com --since 7d --json
```
