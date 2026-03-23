# AI Dev Toolkit — Project Instructions

## Purpose
This repo is a library of reusable Claude Code extensions: skills, plugins, hooks, agents, and MCP servers. All work here should produce portable, well-documented extensions that can be dropped into any project.

## Directory Conventions

| Directory      | Contents                          | File Format          |
|----------------|-----------------------------------|----------------------|
| `skills/`      | Slash command skills              | `.md` with frontmatter |
| `plugins/`     | Multi-agent plugin packages       | Subdirectory per plugin |
| `hooks/`       | Lifecycle hook scripts            | Shell scripts (`.sh`) or JS (`.mjs`) |
| `agents/`      | Custom agent definitions          | `.md` with frontmatter |
| `mcp-servers/` | MCP server implementations        | Subdirectory per server |
| `templates/`   | Starter templates for new items   | Mirrors above structure |

## Standards

- Every extension MUST include a description in its header/frontmatter explaining what it does and when to use it
- Skills and agents use markdown with YAML frontmatter
- Plugins follow the Claude Code plugin structure (package.json + agent .md files)
- Hook scripts must be executable and handle errors gracefully
- MCP servers should include a README with setup instructions

## Naming

- Use kebab-case for all file and directory names (e.g., `code-reviewer.md`, `pr-review-toolkit/`)
- Skill files are named after their slash command (e.g., `commit.md` → `/commit`)
- Agent files are named after their agent type (e.g., `code-explorer.md`)

## Testing

- Test skills by invoking them in a scratch project before committing
- Test hooks by configuring them locally and triggering the relevant event
- MCP servers should include basic integration tests
