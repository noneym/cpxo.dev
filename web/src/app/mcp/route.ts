// Remote MCP endpoint (Streamable HTTP): https://cpxo.dev/mcp
import { mcpHandler } from "@/lib/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export { mcpHandler as GET, mcpHandler as POST, mcpHandler as DELETE };
