import ExcelJS from "exceljs";
import type { PersonnelRow, PersonnelCustomField } from "./dataStore";

const HEADER_BG = "3D6273";
const ROW_ALT_BG = "F5F7F8";

export async function buildPersonnelExcel(
  clientName: string,
  rows: PersonnelRow[],
  customFieldDefs: PersonnelCustomField[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OuterJoin ARIA";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Personnel");

  // --- Columns ---
  const baseColumns: Partial<ExcelJS.Column>[] = [
    { header: "Role",           key: "role",      width: 24 },
    { header: "Name & Surname", key: "name",      width: 28 },
    { header: "Email",          key: "email",     width: 32 },
    { header: "Cell Number",    key: "cell",      width: 18 },
    { header: "Channels",       key: "channels",  width: 36 },
    { header: "Principal",      key: "principal", width: 28 },
    { header: "Brand",          key: "brand",     width: 28 },
  ];

  const activeCustom = customFieldDefs.filter((f) => f.active).sort((a, b) => a.order - b.order);
  const customColumns: Partial<ExcelJS.Column>[] = activeCustom.map((f) => ({
    header: f.label,
    key: f.id,
    width: 24,
  }));

  sheet.columns = [...baseColumns, ...customColumns] as ExcelJS.Column[];

  // --- Header row styling ---
  const headerRow = sheet.getRow(1);
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${HEADER_BG}` },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // --- Data rows ---
  rows.forEach((row, i) => {
    const isAlt = i % 2 === 1;
    const bgColor = isAlt ? `FF${ROW_ALT_BG}` : "FFFFFFFF";

    const rowData: Record<string, string> = {
      role: row.role,
      name: row.name,
      email: row.email,
      cell: row.cell,
      channels: row.channels.join(", "),
      principal: row.principal ?? "",
      brand: row.brand ?? "",
    };
    activeCustom.forEach((f) => {
      rowData[f.id] = row.customFields?.[f.id] ?? "";
    });

    const sheetRow = sheet.addRow(rowData);
    sheetRow.height = 18;
    sheetRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" },
      };
    });
  });

  // --- Metadata row ---
  const metaRow = sheet.addRow([]);
  sheet.addRow([]);
  const metaCell = sheet.getCell(`A${metaRow.number}`);
  metaCell.value = `Client: ${clientName}  |  Generated: ${new Date().toLocaleDateString("en-ZA")}  |  Total: ${rows.length} people`;
  metaCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF718096" } };
  sheet.mergeCells(`A${metaRow.number}:${String.fromCharCode(64 + baseColumns.length + activeCustom.length)}${metaRow.number}`);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
