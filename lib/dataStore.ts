import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

function readJson<T>(file: string): T {
  const filePath = path.join(dataDir, file);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function writeJson(file: string, data: unknown): void {
  const filePath = path.join(dataDir, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export type CAM = { id: string; name: string; email: string };
export type Channel = { id: string; name: string };

export function getCams(): CAM[] {
  return readJson<CAM[]>("cams.json");
}

export function saveCams(cams: CAM[]): void {
  writeJson("cams.json", cams);
}

export function getChannels(): Channel[] {
  return readJson<Channel[]>("channels.json");
}

export function saveChannels(channels: Channel[]): void {
  writeJson("channels.json", channels);
}
