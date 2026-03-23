import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Config — read from environment
// ---------------------------------------------------------------------------
const JIRA_BASE_URL = (process.env.JIRA_BASE_URL || "").replace(/\/+$/, "");
const JIRA_EMAIL = process.env.JIRA_EMAIL || "";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || "";
const DOWNLOAD_DIR = process.env.JIRA_DOWNLOAD_DIR || join(process.cwd(), "jira-attachments");

function authHeaders() {
  if (!JIRA_BASE_URL) throw new Error("JIRA_BASE_URL is not set");
  if (!JIRA_EMAIL || !JIRA_API_TOKEN) throw new Error("JIRA_EMAIL and JIRA_API_TOKEN must be set");
  const token = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
  return {
    Authorization: `Basic ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function jiraGet(path) {
  const url = `${JIRA_BASE_URL}/rest/api/3/${path}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira API ${res.status}: ${body}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Helpers — parse Atlassian Document Format (ADF) to readable text
// ---------------------------------------------------------------------------
function adfToText(node, depth = 0) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text") return node.text || "";

  const children = (node.content || []).map((c) => adfToText(c, depth)).join("");

  switch (node.type) {
    case "paragraph":
      return children + "\n";
    case "heading":
      return "#".repeat(node.attrs?.level || 1) + " " + children + "\n";
    case "bulletList":
      return (node.content || []).map((li) => "  ".repeat(depth) + "- " + adfToText(li, depth + 1)).join("");
    case "orderedList":
      return (node.content || [])
        .map((li, i) => "  ".repeat(depth) + `${i + 1}. ` + adfToText(li, depth + 1))
        .join("");
    case "listItem":
      return (node.content || []).map((c) => adfToText(c, depth)).join("");
    case "codeBlock":
      return "```\n" + children + "```\n";
    case "blockquote":
      return children
        .split("\n")
        .map((l) => "> " + l)
        .join("\n") + "\n";
    case "table":
      return children + "\n";
    case "tableRow":
      return "| " + (node.content || []).map((c) => adfToText(c, depth)).join(" | ") + " |\n";
    case "tableCell":
    case "tableHeader":
      return children.trim();
    case "hardBreak":
      return "\n";
    case "rule":
      return "---\n";
    case "mediaSingle":
    case "media":
      return `[attachment: ${node.attrs?.alt || node.attrs?.id || "media"}]\n`;
    case "panel":
      return `[${node.attrs?.panelType || "panel"}]\n${children}\n`;
    default:
      return children;
  }
}

function extractField(fields, ...names) {
  for (const name of names) {
    const val = fields[name];
    if (val && typeof val === "object" && val.content) return adfToText(val).trim();
    if (val && typeof val === "string") return val.trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = new McpServer({
  name: "jira",
  version: "0.1.0",
});

// ---- get-ticket -----------------------------------------------------------
server.registerTool(
  "get-ticket",
  {
    title: "Get Jira Ticket",
    description:
      "Fetch full Jira ticket details including summary, description, acceptance criteria, expected/actual results, status, priority, labels, components, and all custom fields",
    inputSchema: z.object({
      ticketKey: z.string().describe("Jira ticket key, e.g. PROJ-123"),
      includeCustomFields: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include all custom field values in the output"),
    }),
  },
  async ({ ticketKey, includeCustomFields }) => {
    const data = await jiraGet(
      `issue/${ticketKey}?expand=renderedFields,names`
    );
    const { fields, names: fieldNames } = data;

    // Build structured output
    const lines = [];
    lines.push(`# ${ticketKey}: ${fields.summary}`);
    lines.push("");
    lines.push(`**Status:** ${fields.status?.name || "Unknown"}`);
    lines.push(`**Type:** ${fields.issuetype?.name || "Unknown"}`);
    lines.push(`**Priority:** ${fields.priority?.name || "Unknown"}`);
    lines.push(`**Assignee:** ${fields.assignee?.displayName || "Unassigned"}`);
    lines.push(`**Reporter:** ${fields.reporter?.displayName || "Unknown"}`);
    lines.push(`**Created:** ${fields.created}`);
    lines.push(`**Updated:** ${fields.updated}`);

    if (fields.labels?.length) {
      lines.push(`**Labels:** ${fields.labels.join(", ")}`);
    }
    if (fields.components?.length) {
      lines.push(`**Components:** ${fields.components.map((c) => c.name).join(", ")}`);
    }
    if (fields.fixVersions?.length) {
      lines.push(`**Fix Versions:** ${fields.fixVersions.map((v) => v.name).join(", ")}`);
    }
    if (fields.resolution) {
      lines.push(`**Resolution:** ${fields.resolution.name}`);
    }

    // Sprint info
    const sprintField = Object.keys(fields).find(
      (k) => k.startsWith("customfield_") && fieldNames?.[k]?.toLowerCase().includes("sprint")
    );
    if (sprintField && fields[sprintField]) {
      const sprints = Array.isArray(fields[sprintField]) ? fields[sprintField] : [fields[sprintField]];
      const sprintNames = sprints.map((s) => s.name || s).filter(Boolean);
      if (sprintNames.length) lines.push(`**Sprint:** ${sprintNames.join(", ")}`);
    }

    // Story points
    const pointsField = Object.keys(fields).find(
      (k) =>
        k.startsWith("customfield_") &&
        (fieldNames?.[k]?.toLowerCase().includes("story point") ||
          fieldNames?.[k]?.toLowerCase().includes("estimation"))
    );
    if (pointsField && fields[pointsField] != null) {
      lines.push(`**Story Points:** ${fields[pointsField]}`);
    }

    // Description
    lines.push("");
    lines.push("## Description");
    const desc = extractField(fields, "description");
    lines.push(desc || "_No description_");

    // Acceptance Criteria — check common custom field names
    const acField = Object.keys(fields).find(
      (k) =>
        k.startsWith("customfield_") &&
        fieldNames?.[k]?.toLowerCase().includes("acceptance criteria")
    );
    if (acField && fields[acField]) {
      lines.push("");
      lines.push("## Acceptance Criteria");
      const ac = typeof fields[acField] === "object" && fields[acField].content
        ? adfToText(fields[acField]).trim()
        : String(fields[acField]);
      lines.push(ac);
    }

    // Expected Result
    const expectedField = Object.keys(fields).find(
      (k) =>
        k.startsWith("customfield_") &&
        fieldNames?.[k]?.toLowerCase().includes("expected result")
    );
    if (expectedField && fields[expectedField]) {
      lines.push("");
      lines.push("## Expected Result");
      const val = typeof fields[expectedField] === "object" && fields[expectedField].content
        ? adfToText(fields[expectedField]).trim()
        : String(fields[expectedField]);
      lines.push(val);
    }

    // Actual Result
    const actualField = Object.keys(fields).find(
      (k) =>
        k.startsWith("customfield_") &&
        fieldNames?.[k]?.toLowerCase().includes("actual result")
    );
    if (actualField && fields[actualField]) {
      lines.push("");
      lines.push("## Actual Result");
      const val = typeof fields[actualField] === "object" && fields[actualField].content
        ? adfToText(fields[actualField]).trim()
        : String(fields[actualField]);
      lines.push(val);
    }

    // Steps to Reproduce
    const stepsField = Object.keys(fields).find(
      (k) =>
        k.startsWith("customfield_") &&
        fieldNames?.[k]?.toLowerCase().includes("steps to reproduce")
    );
    if (stepsField && fields[stepsField]) {
      lines.push("");
      lines.push("## Steps to Reproduce");
      const val = typeof fields[stepsField] === "object" && fields[stepsField].content
        ? adfToText(fields[stepsField]).trim()
        : String(fields[stepsField]);
      lines.push(val);
    }

    // Environment
    if (fields.environment) {
      lines.push("");
      lines.push("## Environment");
      const env = typeof fields.environment === "object" && fields.environment.content
        ? adfToText(fields.environment).trim()
        : String(fields.environment);
      lines.push(env);
    }

    // Linked issues
    if (fields.issuelinks?.length) {
      lines.push("");
      lines.push("## Linked Issues");
      for (const link of fields.issuelinks) {
        const related = link.outwardIssue || link.inwardIssue;
        const direction = link.outwardIssue ? link.type?.outward : link.type?.inward;
        if (related) {
          lines.push(`- **${direction}** ${related.key}: ${related.fields?.summary || ""}`);
        }
      }
    }

    // Sub-tasks
    if (fields.subtasks?.length) {
      lines.push("");
      lines.push("## Sub-tasks");
      for (const sub of fields.subtasks) {
        lines.push(`- ${sub.key}: ${sub.fields?.summary} [${sub.fields?.status?.name}]`);
      }
    }

    // Attachments summary
    if (fields.attachment?.length) {
      lines.push("");
      lines.push(`## Attachments (${fields.attachment.length})`);
      for (const att of fields.attachment) {
        const size = att.size ? ` (${(att.size / 1024).toFixed(1)} KB)` : "";
        lines.push(`- **${att.filename}**${size} — uploaded by ${att.author?.displayName || "unknown"} on ${att.created}`);
      }
    }

    // All custom fields (optional)
    if (includeCustomFields) {
      lines.push("");
      lines.push("## All Custom Fields");
      for (const key of Object.keys(fields).filter((k) => k.startsWith("customfield_"))) {
        if (fields[key] == null) continue;
        const name = fieldNames?.[key] || key;
        let val;
        if (typeof fields[key] === "object" && fields[key].content) {
          val = adfToText(fields[key]).trim();
        } else if (typeof fields[key] === "object") {
          val = JSON.stringify(fields[key]);
        } else {
          val = String(fields[key]);
        }
        if (val) lines.push(`- **${name}:** ${val}`);
      }
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ---- get-comments ---------------------------------------------------------
server.registerTool(
  "get-comments",
  {
    title: "Get Ticket Comments",
    description: "Fetch all comments on a Jira ticket, newest first",
    inputSchema: z.object({
      ticketKey: z.string().describe("Jira ticket key, e.g. PROJ-123"),
      maxResults: z.number().optional().default(50).describe("Max comments to return"),
    }),
  },
  async ({ ticketKey, maxResults }) => {
    const data = await jiraGet(
      `issue/${ticketKey}/comment?maxResults=${maxResults}&orderBy=-created`
    );
    const comments = data.comments || [];

    if (!comments.length) {
      return { content: [{ type: "text", text: `No comments on ${ticketKey}.` }] };
    }

    const lines = [`# Comments on ${ticketKey} (${comments.length})\n`];
    for (const c of comments) {
      lines.push(`### ${c.author?.displayName || "Unknown"} — ${c.created}`);
      const body = c.body ? adfToText(c.body).trim() : "_empty_";
      lines.push(body);
      lines.push("");
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ---- list-attachments -----------------------------------------------------
server.registerTool(
  "list-attachments",
  {
    title: "List Attachments",
    description: "List all attachments on a Jira ticket with download IDs",
    inputSchema: z.object({
      ticketKey: z.string().describe("Jira ticket key, e.g. PROJ-123"),
    }),
  },
  async ({ ticketKey }) => {
    const data = await jiraGet(`issue/${ticketKey}?fields=attachment`);
    const attachments = data.fields?.attachment || [];

    if (!attachments.length) {
      return { content: [{ type: "text", text: `No attachments on ${ticketKey}.` }] };
    }

    const lines = [`# Attachments on ${ticketKey} (${attachments.length})\n`];
    lines.push("| # | Filename | Size | Type | Author | Date | ID |");
    lines.push("|---|----------|------|------|--------|------|----|");
    attachments.forEach((att, i) => {
      const size = att.size ? `${(att.size / 1024).toFixed(1)} KB` : "?";
      lines.push(
        `| ${i + 1} | ${att.filename} | ${size} | ${att.mimeType || "?"} | ${att.author?.displayName || "?"} | ${att.created?.split("T")[0] || "?"} | ${att.id} |`
      );
    });
    lines.push("");
    lines.push("Use the **download-attachment** tool with the attachment ID to download a file.");

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ---- download-attachment --------------------------------------------------
server.registerTool(
  "download-attachment",
  {
    title: "Download Attachment",
    description:
      "Download a Jira attachment by ID to the local filesystem. Returns the saved file path.",
    inputSchema: z.object({
      attachmentId: z.string().describe("Jira attachment ID (from list-attachments)"),
      outputDir: z
        .string()
        .optional()
        .describe("Directory to save the file to. Defaults to JIRA_DOWNLOAD_DIR env or ./jira-attachments"),
    }),
  },
  async ({ attachmentId, outputDir }) => {
    // Get attachment metadata
    const meta = await jiraGet(`attachment/${attachmentId}`);
    const filename = meta.filename || `attachment-${attachmentId}`;
    const downloadUrl = meta.content;

    if (!downloadUrl) {
      throw new Error(`No download URL found for attachment ${attachmentId}`);
    }

    // Download the file
    const res = await fetch(downloadUrl, { headers: authHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to download attachment: ${res.status} ${res.statusText}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const dir = outputDir || DOWNLOAD_DIR;
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, filename);
    await writeFile(filePath, buffer);

    return {
      content: [
        {
          type: "text",
          text: `Downloaded **${filename}** (${(buffer.length / 1024).toFixed(1)} KB) to:\n\`${filePath}\``,
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
