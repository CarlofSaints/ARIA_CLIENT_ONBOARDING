import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const SEED_SECRET = "aria-seed-2026";
const DATA_DIR = path.join(process.cwd(), "data");

const FILES_TO_SEED = [
  "cams.json",
  "channels.json",
  "checklist.json",
  "clients.json",
  "logs.json",
  "permissions.json",
  "personnelConfig.json",
  "roles.json",
  "users.json",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.secret !== SEED_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: Record<string, string> = {};

    for (const filename of FILES_TO_SEED) {
      const filePath = path.join(DATA_DIR, filename);
      if (!fs.existsSync(filePath)) {
        results[filename] = "SKIPPED (file not found)";
        continue;
      }
      const content = fs.readFileSync(filePath, "utf-8");
      // Validate JSON
      JSON.parse(content);

      await put(`aria/${filename}`, content, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      results[filename] = "OK";
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
