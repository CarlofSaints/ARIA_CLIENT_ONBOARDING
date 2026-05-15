import { NextResponse } from "next/server";
import { getClients, saveClients } from "@/lib/dataStore";
import {
  getDropboxToken,
  dropboxJson,
  DROPBOX_BASE_PATH,
  DROPBOX_TEMPLATE_FOLDER,
} from "@/lib/dropboxApi";
import { addLog } from "@/lib/activityLog";

type DropboxEntry = {
  ".tag": "file" | "folder";
  name: string;
  path_lower: string;
  path_display: string;
  id: string;
};

type ListFolderResult = {
  entries: DropboxEntry[];
  cursor: string;
  has_more: boolean;
};

type FolderMetadata = {
  metadata: { id: string; path_display: string };
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    userName?: string;
  };
  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = clients[idx];
  if (client.dropboxStatus === "created") {
    return NextResponse.json(
      { error: "Dropbox folder already created for this client" },
      { status: 409 }
    );
  }

  try {
    const token = await getDropboxToken();
    const clientFolderPath = `${DROPBOX_BASE_PATH}/${client.name}`;

    // 1. Create client folder
    let folderId: string;
    try {
      const folder = await dropboxJson<FolderMetadata>(
        token,
        "files/create_folder_v2",
        { path: clientFolderPath, autorename: false }
      );
      folderId = folder.metadata.id;
    } catch (err) {
      const msg = (err as Error).message ?? "";
      // Folder already exists — that's OK, get its metadata
      if (msg.includes("409") || msg.includes("conflict") || msg.includes("path/conflict")) {
        const meta = await dropboxJson<{ id: string }>(
          token,
          "files/get_metadata",
          { path: clientFolderPath }
        );
        folderId = meta.id;
      } else {
        throw err;
      }
    }

    // 2. List template files in 0_MasterTemplates
    const templates = await dropboxJson<ListFolderResult>(
      token,
      "files/list_folder",
      { path: DROPBOX_TEMPLATE_FOLDER }
    );

    const fileEntries = templates.entries.filter((e) => e[".tag"] === "file");

    // 3. Copy each file, replacing "CLIENT" in filename with client name
    let copiedCount = 0;
    for (const file of fileEntries) {
      const newName = file.name.replace(/CLIENT/g, client.name);
      const toPath = `${clientFolderPath}/${newName}`;
      try {
        await dropboxJson(token, "files/copy_v2", {
          from_path: file.path_display || file.path_lower,
          to_path: toPath,
          autorename: false,
        });
        copiedCount++;
      } catch (copyErr) {
        const copyMsg = (copyErr as Error).message ?? "";
        // File already exists — skip, don't fail
        if (copyMsg.includes("409") || copyMsg.includes("conflict") || copyMsg.includes("to/conflict")) {
          copiedCount++;
          continue;
        }
        throw copyErr;
      }
    }

    // 4. Persist status
    const freshClients = await getClients();
    const freshIdx = freshClients.findIndex((c) => c.id === id);
    if (freshIdx !== -1) {
      freshClients[freshIdx].dropboxStatus = "created";
      freshClients[freshIdx].dropboxFolderId = folderId;
      await saveClients(freshClients);
    }

    await addLog({
      action: "dropbox.created",
      clientId: client.id,
      clientName: client.name,
      userId: body.userId,
      userName: body.userName,
      details: `Dropbox folder created at ${clientFolderPath}. ${copiedCount} template file(s) copied.`,
      success: true,
    });

    return NextResponse.json({
      ok: true,
      folder: clientFolderPath,
      filesCopied: copiedCount,
    });
  } catch (err) {
    console.error("Dropbox folder creation error:", err);
    const errMsg = (err as Error).message ?? String(err);

    await addLog({
      action: "dropbox.created",
      clientId: client.id,
      clientName: client.name,
      userId: body.userId,
      userName: body.userName,
      details: "Dropbox folder creation failed.",
      success: false,
      error: errMsg.slice(0, 300),
    });

    const freshClients = await getClients();
    const freshIdx = freshClients.findIndex((c) => c.id === id);
    if (freshIdx !== -1) {
      freshClients[freshIdx].dropboxStatus = "error";
      freshClients[freshIdx].dropboxError = errMsg.slice(0, 300);
      await saveClients(freshClients);
    }

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
