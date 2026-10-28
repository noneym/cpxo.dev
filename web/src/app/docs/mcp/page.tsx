import { Doc, Step } from "@/components/Doc";
import { CodeBlock } from "@/components/CodeBlock";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function McpDoc() {
  const user = await currentUser();
  const token = user ? (await prisma.apiToken.findFirst({ where: { userId: user.id }, orderBy: { id: "asc" } }))?.token : null;
  const T = token ?? "cpx_YOURTOKEN";
  const url = `${config.appUrl}/mcp`;

  return (
    <Doc
      active="/docs/mcp"
      title="Give your AI the clipboard."
      lead="cpxo is a remote MCP server. Claude, Cursor, Codex or any MCP client can read what you copied on your phone, hand you text, and upload files that come back as share links."
    >
      <Step n={1} title="What the AI can do">
        <p>Six tools, scoped to your account by your API token:</p>
        <ul className="list-disc space-y-1 pl-5 text-mist">
          <li><code>clipboard_latest</code>: the most recent clip from any device.</li>
          <li><code>clipboard_history</code>: search and filter the history (iPhone, Mac, Windows, shell, web, AI).</li>
          <li><code>clipboard_push</code>: put text on your clipboard. Lands on Mac and Windows in seconds, on the iPhone with the Get shortcut.</li>
          <li><code>files_list</code>: your shared files with links, sizes and expiry.</li>
          <li><code>file_upload</code>: upload text or base64 content and get a 7-day share link (inline limit 25 MB).</li>
          <li><code>file_delete</code>: remove a file now.</li>
        </ul>
        <p>Endpoint: <code>{url}</code> (Streamable HTTP). Auth: <code>Authorization: Bearer {T}</code>.</p>
        {!token && <p className="text-sm">Sign in and this page fills in your real token.</p>}
      </Step>

      <Step n={2} title="Claude Code">
        <CodeBlock code={`claude mcp add --transport http cpxo ${url} --header "Authorization: Bearer ${T}"`} />
        <p>Then ask things like <em>&quot;what did I just copy on my phone?&quot;</em> or <em>&quot;upload this file to cpxo and give me the link&quot;</em>.</p>
      </Step>

      <Step n={3} title="Cursor, Windsurf, VS Code">
        <p>Add to <code>.cursor/mcp.json</code>, <code>~/.codeium/windsurf/mcp_config.json</code> or VS Code&apos;s <code>mcp.json</code>:</p>
        <CodeBlock
          code={`{
  "mcpServers": {
    "cpxo": {
      "url": "${url}",
      "headers": { "Authorization": "Bearer ${T}" }
    }
  }
}`}
        />
      </Step>

      <Step n={4} title="Claude Desktop and other stdio-only clients">
        <p>Bridge the remote server with <code>mcp-remote</code> in <code>claude_desktop_config.json</code>:</p>
        <CodeBlock
          code={`{
  "mcpServers": {
    "cpxo": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${url}", "--header", "Authorization: Bearer ${T}"]
    }
  }
}`}
        />
      </Step>

      <Step n={5} title="Codex CLI">
        <p>In <code>~/.codex/config.toml</code>:</p>
        <CodeBlock
          code={`[mcp_servers.cpxo]
url = "${url}"
http_headers = { Authorization = "Bearer ${T}" }`}
        />
      </Step>

      <Step n={6} title="Security">
        <p>
          The token is the whole key: anyone holding it can read your clipboard history and files. Create a separate token for each AI client on the dashboard so you can revoke one without touching your phone or desktop apps.
          Clips pushed by an AI show up with a robot icon and the source <code>ai</code>.
        </p>
      </Step>
    </Doc>
  );
}
