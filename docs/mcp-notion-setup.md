# Notion MCP setup

Connects the Notion MCP to Claude Code so `new-content` can import pages directly from the Ocobo Notion workspace.

## Prerequisites

- Access to the Ocobo Notion workspace
- Claude.ai account (claude.ai/code or desktop app)

## Setup steps

1. **Open Claude.ai → Settings → Integrations**

2. **Add Notion** — click "Add integration" and select Notion.

3. **Authorise the Ocobo workspace** — when Notion asks which workspace to connect, select the Ocobo workspace. Grant the requested permissions (read pages and databases).

4. **Verify the connection** — in Claude Code, run:
   ```
   new-content https://notion.so/<any-page-url>
   ```
   If the MCP is connected, Claude will fetch the page and begin mapping fields. If it is not connected, you will see:
   > Notion MCP is not configured. To use Notion import, follow `docs/mcp-notion-setup.md`.

## Troubleshooting

**"Notion MCP is not configured"** — the integration was not found. Re-check Settings → Integrations and confirm the Notion tile shows "Connected".

**"Cannot access this page"** — the page is in a workspace or space that was not included in the authorisation. Share the page with the Ocobo integration or re-authorise with broader workspace access.

**Image URLs expire** — Notion file attachments use temporary S3 URLs (valid ~1 hour). The skill downloads images immediately on import. If you get a 403 on an image, re-run the import from the original Notion URL.

**Works without Notion MCP** — all other `new-content` modes (interview, local file) work without any MCP setup.
