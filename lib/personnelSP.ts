import { getOJToken, graph, graphJson, SP_HOST } from "./graphOJ";

async function getClientsDriveId(token: string): Promise<{ siteId: string; driveId: string }> {
  const site = await graphJson<{ id: string }>(token, `/sites/${SP_HOST}`);
  const siteId = site.id;
  const drivesData = await graphJson<{ value: Array<{ id: string; name: string }> }>(
    token,
    `/sites/${siteId}/drives`
  );
  const clientsDrive = drivesData.value.find((d) => d.name === "Clients");
  if (!clientsDrive) throw new Error("'Clients' document library not found on SharePoint site");
  return { siteId, driveId: clientsDrive.id };
}

export async function uploadPersonnelFile(
  buffer: Buffer,
  clientName: string,
  fileName: string
): Promise<{ webUrl: string }> {
  const token = await getOJToken();
  const { driveId } = await getClientsDriveId(token);

  const clientFolderName = clientName.toUpperCase();
  const filePath = `${clientFolderName}/ARIA/01_Admin/Client Admin/${fileName}`;
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");

  const uploadRes = await graph(
    token,
    `/drives/${driveId}/root:/${encodedPath}:/content`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      body: buffer as unknown as BodyInit,
    }
  );

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`SP upload failed: ${uploadRes.status} ${text}`);
  }

  const data = await uploadRes.json() as { webUrl?: string };
  return { webUrl: data.webUrl ?? "" };
}
