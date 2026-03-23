---
description: "Read a Jira ticket with full details — description, acceptance criteria, expected/actual results, comments, and attachments. Use when you need context from a Jira ticket."
---

# Jira Ticket Reader

Read a Jira ticket and present all relevant details in a structured format.

## Inputs

- `$ARGUMENTS` — The Jira ticket key (e.g., `PROJ-123`). Optionally append `--download` to also download all attachments.

## Instructions

1. **Parse the input.** Extract the ticket key from `$ARGUMENTS`. Check if `--download` flag is present.

2. **Fetch the ticket.** Use the `mcp__jira__get-ticket` tool with:
   - `ticketKey`: the extracted key
   - `includeCustomFields`: `true`

3. **Fetch comments.** Use the `mcp__jira__get-comments` tool with:
   - `ticketKey`: the extracted key

4. **List attachments.** Use the `mcp__jira__list-attachments` tool with:
   - `ticketKey`: the extracted key

5. **Present everything** in a single structured response:

   ```
   ## [TICKET-KEY]: Summary

   **Status** | **Type** | **Priority** | **Assignee** | **Sprint**

   ### Description
   (full description text)

   ### Acceptance Criteria
   (if present)

   ### Expected Result
   (if present)

   ### Actual Result
   (if present)

   ### Steps to Reproduce
   (if present)

   ### Environment
   (if present)

   ### Linked Issues
   (if any)

   ### Attachments
   (table of attachments with names, sizes, types)

   ### Comments
   (all comments, newest first, with author and date)
   ```

6. **Download attachments** (only if `--download` flag was provided):
   - For each attachment, call `mcp__jira__download-attachment` with its ID
   - Report the saved file paths

7. **Summarize** key takeaways at the end — what this ticket is about, what's expected, and any blockers visible in comments.
