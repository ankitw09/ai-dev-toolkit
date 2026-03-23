# Jira MCP Server

MCP server that provides tools for reading Jira tickets, comments, and downloading attachments.

## Tools

| Tool | Description |
|------|-------------|
| `get-ticket` | Fetch full ticket details — summary, description, acceptance criteria, expected/actual results, status, priority, labels, components, linked issues, sub-tasks, and custom fields |
| `get-comments` | Fetch all comments on a ticket (newest first) |
| `list-attachments` | List all attachments with IDs, filenames, sizes, and authors |
| `download-attachment` | Download an attachment by ID to the local filesystem |

## Setup

### 1. Get a Jira API Token

- Go to https://id.atlassian.com/manage-profile/security/api-tokens
- Click **Create API token**
- Copy the token

### 2. Set Environment Variables

```bash
export JIRA_BASE_URL="https://your-org.atlassian.net"
export JIRA_EMAIL="your-email@company.com"
export JIRA_API_TOKEN="your-api-token"
# Optional: custom download directory (defaults to ./jira-attachments)
export JIRA_DOWNLOAD_DIR="/path/to/downloads"
```

### 3. Install Dependencies

```bash
cd mcp-servers/jira
npm install
```

### 4. Register in Claude Code

Add to your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["path/to/ai-dev-toolkit/mcp-servers/jira/index.mjs"],
      "env": {
        "JIRA_BASE_URL": "https://your-org.atlassian.net",
        "JIRA_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

Or add to your global settings at `~/.claude/settings.json` to make it available across all projects.

## Usage with the Skill

Copy `skills/jira-reader.md` to your project's `.claude/commands/jira-reader.md`, then invoke:

```
/jira-reader PROJ-123
/jira-reader PROJ-123 --download
```

## Supported Jira Fields

The `get-ticket` tool automatically detects and extracts these fields (including custom fields):

- Summary, Description, Status, Type, Priority
- Assignee, Reporter, Labels, Components
- Fix Versions, Sprint, Story Points
- **Acceptance Criteria** (custom field)
- **Expected Result** (custom field)
- **Actual Result** (custom field)
- **Steps to Reproduce** (custom field)
- Environment, Linked Issues, Sub-tasks
- All custom fields (when `includeCustomFields: true`)

The server uses the Jira field names API to dynamically find custom fields regardless of their `customfield_` ID.
