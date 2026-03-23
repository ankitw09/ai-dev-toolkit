# AI Dev Toolkit

A collection of custom Claude Code extensions — skills, plugins, hooks, agents, and MCP servers — to supercharge AI-assisted development workflows.

## Directory Structure

```
ai-dev-toolkit/
├── skills/           # Slash command skills (.md files)
├── plugins/          # Claude Code plugins (multi-agent tools)
├── hooks/            # Hook scripts for Claude Code events
├── agents/           # Custom agent definitions (.md files)
├── mcp-servers/      # MCP server implementations
└── templates/        # Starter templates for creating new extensions
```

## What's What

### Skills (`skills/`)
Markdown-based slash commands that users invoke with `/<skill-name>`. Each skill is a `.md` file containing a prompt template that Claude executes inline. Install by copying into `.claude/commands/` in any project.

### Plugins (`plugins/`)
Packaged extensions that provide specialized sub-agents with their own tool sets. Plugins are registered in `.claude/settings.json` under `plugins` and can expose multiple agent types.

### Hooks (`hooks/`)
Shell scripts that run automatically in response to Claude Code lifecycle events (e.g., pre-commit validation, post-tool-call checks). Configured in `.claude/settings.json` under `hooks`.

### Agents (`agents/`)
Custom agent definitions (`.md` files) that specialize Claude's behavior for specific tasks. Install by copying into `.claude/agents/` in any project.

### MCP Servers (`mcp-servers/`)
Model Context Protocol server implementations that provide Claude with custom tools, resources, and context from external systems.

### Templates (`templates/`)
Starter templates for creating new skills, plugins, hooks, agents, and MCP servers.

## Installation

To use any extension in your project:

1. **Skills** — Copy `.md` files into your project's `.claude/commands/` directory
2. **Agents** — Copy `.md` files into your project's `.claude/agents/` directory
3. **Plugins** — Add the plugin path to `.claude/settings.json` under `plugins`
4. **Hooks** — Add hook config to `.claude/settings.json` under `hooks`
5. **MCP Servers** — Add server config to `.claude/settings.json` under `mcpServers`

## Contributing

Each extension should include:
- A clear purpose description in its frontmatter or header
- Usage examples
- Any dependencies or prerequisites
