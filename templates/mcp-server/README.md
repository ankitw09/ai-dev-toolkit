# MCP Server: server-name

## Description

What this MCP server provides (tools, resources, prompts).

## Setup

1. Install dependencies: `npm install`
2. Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server/index.mjs"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `tool-name` | What it does |

## Development

```bash
npm run dev
```
