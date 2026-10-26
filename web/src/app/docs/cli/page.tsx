import { Doc, Step } from "@/components/Doc";
import { CodeBlock } from "@/components/CodeBlock";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function CliDoc() {
  const user = await currentUser();
  const token = user ? (await prisma.apiToken.findFirst({ where: { userId: user.id }, orderBy: { id: "asc" } }))?.token : null;
  const T = token ?? "cpx_YOURTOKEN";
  const base = config.appUrl;

  return (
    <Doc
      active="/docs/cli"
      title="Upload from any shell."
      lead="curl is enough. Files up to 4 GB, links valid for 7 days, then deleted from storage. A small cpxo script adds clipboard commands."
    >
      <Step n={1} title="Upload with curl">
        <p>The token sits in the path so the command stays short. The response is the share link.</p>
        <CodeBlock code={`curl -T backup.tar.gz ${base}/up/${T}/`} />
        <p>Prefer a header? Same thing:</p>
        <CodeBlock code={`curl -T backup.tar.gz -H "Authorization: Bearer ${T}" ${base}/up`} />
        <p>Pipe anything, name it with <code>?name=</code>:</p>
        <CodeBlock code={`pg_dump mydb | gzip | curl -T - "${base}/up/${T}?name=mydb.sql.gz"`} />
      </Step>

      <Step n={2} title="Download with wget or curl">
        <p>Links are public and unguessable. Anyone with the link can download until it expires.</p>
        <CodeBlock
          code={`wget --content-disposition ${base}/f/k3v9xq2a
curl -JLO ${base}/f/k3v9xq2a`}
        />
      </Step>

      <Step n={3} title="Install the cpxo script (optional)">
        <p>POSIX sh, depends only on curl. Adds clipboard commands and direct-to-storage uploads for very large files.</p>
        <CodeBlock
          code={`curl -fsSL ${base}/cli -o /usr/local/bin/cpxo && chmod +x /usr/local/bin/cpxo
cpxo login ${T}`}
        />
        <CodeBlock
          title="commands"
          code={`cpxo up disk.img          # upload, prints the link
cpxo get k3v9xq2a         # download into the current dir
cpxo copy "hello from srv" # push text to your clipboard
echo "$PWD" | cpxo copy    # or pipe it
cpxo paste                # print the latest clip
cpxo ls                   # your files
cpxo rm 42                # delete now`}
        />
      </Step>

      <Step n={4} title="Limits">
        <p>4 GB per file. 512 KB per clipboard entry. Files are deleted 7 days after upload, both the database row and the object in storage.</p>
      </Step>
    </Doc>
  );
}
