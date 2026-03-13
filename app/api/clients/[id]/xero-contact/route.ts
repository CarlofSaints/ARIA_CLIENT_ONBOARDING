import { NextResponse } from "next/server";
import { after } from "next/server";
import { getClients, saveClients, getLogs, saveLogs } from "@/lib/dataStore";
import { getValidTokens, buildXeroContact, xeroPost, xeroGet } from "@/lib/xero";
import { randomUUID } from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { userId?: string; userName?: string };
  const { userId, userName } = body;

  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const client = clients[idx];
  if (!client.cognitoData) {
    return NextResponse.json(
      { error: "No Cognito data linked to this client — link a Cognito entry first" },
      { status: 400 }
    );
  }

  // Verify Xero is connected
  try {
    await getValidTokens();
  } catch {
    return NextResponse.json({ error: "Xero is not connected. Go to Admin → Xero to connect." }, { status: 400 });
  }

  const contactPayload = buildXeroContact(client.cognitoData);

  let xeroContactId: string;
  let xeroContactUrl: string;

  try {
    // If already created, update rather than create
    if (client.xeroContactId) {
      const res = await xeroPost(`/Contacts/${client.xeroContactId}`, contactPayload) as {
        Contacts?: { ContactID: string }[];
      };
      xeroContactId = res.Contacts?.[0]?.ContactID ?? client.xeroContactId;
    } else {
      // Check if a contact with this name already exists
      const company = contactPayload.Name;
      let existingId: string | null = null;
      if (company) {
        try {
          const search = await xeroGet(
            `/Contacts?where=Name=="${company.replace(/"/g, '\\"')}"&summaryOnly=true`
          ) as { Contacts?: { ContactID: string }[] };
          existingId = search.Contacts?.[0]?.ContactID ?? null;
        } catch { /* ignore search errors */ }
      }

      if (existingId) {
        // Update the existing contact
        const res = await xeroPost(`/Contacts/${existingId}`, contactPayload) as {
          Contacts?: { ContactID: string }[];
        };
        xeroContactId = res.Contacts?.[0]?.ContactID ?? existingId;
      } else {
        // Create new contact
        const res = await xeroPost("/Contacts", { Contacts: [contactPayload] }) as {
          Contacts?: { ContactID: string }[];
        };
        xeroContactId = res.Contacts?.[0]?.ContactID ?? "";
        if (!xeroContactId) throw new Error("Xero returned no contact ID");
      }
    }

    xeroContactUrl = `https://go.xero.com/Contacts/View/${xeroContactId}`;

    // Persist the Xero contact ID on the client record
    clients[idx] = { ...clients[idx], xeroContactId, xeroContactUrl };
    await saveClients(clients);

    after(async () => {
      const logs = await getLogs();
      logs.unshift({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        action: "xero.contact",
        clientId: clients[idx].id,
        clientName: clients[idx].name,
        userId,
        userName,
        details: `Xero contact created/updated — ID: ${xeroContactId}`,
        success: true,
      });
      await saveLogs(logs.slice(0, 500));
    });

    return NextResponse.json({ ok: true, xeroContactId, xeroContactUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";

    after(async () => {
      const logs = await getLogs();
      logs.unshift({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        action: "xero.contact",
        clientId: clients[idx].id,
        clientName: clients[idx].name,
        userId,
        userName,
        details: "Xero contact creation failed",
        success: false,
        error: msg,
      });
      await saveLogs(logs.slice(0, 500));
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
