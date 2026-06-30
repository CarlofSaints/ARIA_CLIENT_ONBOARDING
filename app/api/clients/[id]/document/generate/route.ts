import { NextResponse } from "next/server";
import { getClients, getTemplate, type DocTemplateKind } from "@/lib/dataStore";
import { fillDocx, buildDocReplacements, documentFileName } from "@/lib/docTemplate";

export const maxDuration = 60;

const VALID_KINDS: DocTemplateKind[] = ["nda", "sla", "eula"];

// POST — generate a populated .docx from the template + linked Cognito data.
// Returns { fileName, base64 } for the browser to download/preview. Does NOT
// email or persist anything — that's the separate /send route.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { kind } = (await request.json()) as { kind?: string };
  if (!kind || !(VALID_KINDS as string[]).includes(kind)) {
    return NextResponse.json({ error: "Invalid or missing document kind" }, { status: 400 });
  }
  const docKind = kind as DocTemplateKind;

  // Tolerate Vercel Blob eventual consistency: the Cognito link may have just
  // been saved. Retry the read until the client appears WITH cognitoData.
  let clients = await getClients();
  let client = clients.find((c) => c.id === id);
  for (let attempt = 0; attempt < 4 && (!client || !client.cognitoData); attempt++) {
    await new Promise((r) => setTimeout(r, 1500));
    clients = await getClients();
    client = clients.find((c) => c.id === id);
  }

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!client.cognitoData) {
    return NextResponse.json(
      { error: "No Cognito data linked — link a Cognito entry first" },
      { status: 400 }
    );
  }

  const template = await getTemplate(docKind);
  if (!template) {
    return NextResponse.json(
      { error: `No ${docKind.toUpperCase()} template uploaded — upload one in Admin → Legal Templates` },
      { status: 400 }
    );
  }

  try {
    const replacements = buildDocReplacements(client.cognitoData, client.name);
    const filled = fillDocx(template.base64, replacements);
    return NextResponse.json({
      ok: true,
      fileName: documentFileName(docKind, client.name),
      base64: filled.toString("base64"),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Template error: ${msg}` }, { status: 500 });
  }
}
