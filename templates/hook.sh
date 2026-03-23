#!/usr/bin/env bash
# Hook: hook-name
# Event: PreToolUse | PostToolUse | Notification | Stop
# Description: What this hook does
#
# Configure in .claude/settings.json:
# {
#   "hooks": {
#     "EventName": [
#       {
#         "matcher": "ToolName",
#         "hooks": ["path/to/this/hook.sh"]
#       }
#     ]
#   }
# }

set -euo pipefail

# Hook input is passed via stdin as JSON
input=$(cat)

# Parse relevant fields
# tool_name=$(echo "$input" | jq -r '.tool_name // empty')

# Your logic here

# Exit codes:
# 0 = success (proceed)
# 2 = block the action (for Pre* hooks)
# other = error
exit 0
