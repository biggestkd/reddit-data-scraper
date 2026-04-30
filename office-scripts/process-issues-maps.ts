function main(workbook: ExcelScript.Workbook, personName: string = "Goode, Brett") {

  // ── Configuration ─────────────────────────────────────────────────────────
  const flagValue                = "Y";
  const discussionNeeded         = 38; // col AM
  const discussionMc2LeaderColIdx = 33; // col AH
  const mc2leaderColIdx          = 8;  // col I
  const outputName               = "Issues & MAPs";

  const dateColumns = [
    "Issue Date Opened",
    "Issue Due Date",
    "MAP Opened Date",
    "MAP Due Date",
    "Finalized MAP Date",
    "Issue – Farthest date"
  ];

  const sheetsToRemove = [
    "Data Pull - MAP Compliance", "Gov calls", "Issues with No MAPs",
    "Overview ", "Issues with one MAP", "Issue baseline (6-5)",
    "Dashboard", "Sheet4", "Overview - Arun", "Other", "Issue-RISK",
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────

  function safeDelete(name: string): void {
    const sheet = workbook.getWorksheet(name);
    if (sheet) sheet.delete();
  }

  function normalizeHeader(h: string): string {
    return h.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function snapshotAsValues(sheet: ExcelScript.Worksheet): void {
    for (const table of sheet.getTables()) {
      table.convertToRange();
    }
  }

  function renameHeaderByName(
    sheet: ExcelScript.Worksheet,
    oldName: string,
    newName: string
  ): void {
    const used = sheet.getUsedRange();
    if (!used) return;
    const headers = used.getRow(0).getValues()[0] as string[];
    headers.forEach((h, i) => {
      if (normalizeHeader(h) === normalizeHeader(oldName)) {
        sheet.getCell(0, i).setValue(newName);
      }
    });
  }

  // Filters rows from in-memory arrays — avoids getSpecialCells/getAreas and
  // the Power Automate payload size limit that comes with large RangeAreas.
  function filterRows(
    allValues: (string | number | boolean)[][],
    allFormats: string[][],
    conditions: ((row: (string | number | boolean)[]) => boolean)[],
    skipFirstRow: boolean = false
  ): { values: (string | number | boolean)[][], formats: string[][] } {
    const outValues:  (string | number | boolean)[][] = [];
    const outFormats: string[][]                      = [];
    const start = skipFirstRow ? 1 : 0;

    for (let r = start; r < allValues.length; r++) {
      if (conditions.every(fn => fn(allValues[r]))) {
        outValues.push(allValues[r]);
        outFormats.push(allFormats[r]);
      }
    }
    return { values: outValues, formats: outFormats };
  }

  function writeData(
    data: { values: (string | number | boolean)[][], formats: string[][] },
    dst: ExcelScript.Worksheet,
    append: boolean = false
  ): void {
    if (data.values.length === 0) return;
    const cols    = data.values[0].length;
    const dstUsed = dst.getUsedRange();
    const row     = (append && dstUsed) ? dstUsed.getRowCount() : 0;
    dst.getRangeByIndexes(row, 0, data.values.length,  cols).setValues(data.values);
    dst.getRangeByIndexes(row, 0, data.formats.length, cols).setNumberFormats(data.formats);
  }

  // ── 1. Freeze source data ─────────────────────────────────────────────────
  const sourceSheet = workbook.getActiveWorksheet();
  snapshotAsValues(sourceSheet);

  renameHeaderByName(sourceSheet, "Finalized MAP Date - 5/15",   "Finalized MAP Date");
  renameHeaderByName(sourceSheet, "Issue - Farthest date - 5/15", "Issue – Farthest date");

  // ── 2. Remove auxiliary sheets ────────────────────────────────────────────
  for (const name of sheetsToRemove) safeDelete(name);

  // ── 3. Read entire source sheet into memory once ──────────────────────────
  const sourceUsed = sourceSheet.getUsedRange();
  if (!sourceUsed) throw new Error("Source sheet has no data.");

  const allValues  = sourceUsed.getValues()        as (string | number | boolean)[][];
  const allFormats = sourceUsed.getNumberFormats() as string[][];

  // ── 4. Group 1 — discussionNeeded = Y  AND  discussionMc2Leader = personName
  const group1Rows = filterRows(allValues, allFormats, [
    row => row[discussionNeeded]          === flagValue,
    row => String(row[discussionMc2LeaderColIdx]).trim() === personName,
  ]);
  // Prepend header row
  const group1 = {
    values:  [allValues[0],  ...group1Rows.values],
    formats: [allFormats[0], ...group1Rows.formats],
  };

  // ── 5. Group 2 — discussionNeeded = Y  AND  mc2leader = personName
  //                AND  discussionMc2Leader ≠ personName ──────────────────────
  const group2 = filterRows(allValues, allFormats, [
    row => row[discussionNeeded]                         === flagValue,
    row => String(row[mc2leaderColIdx]).trim()           === personName,
    row => String(row[discussionMc2LeaderColIdx]).trim() !== personName,
  ], true); // skip header — already included via group1

  // ── 6. Write combined output ──────────────────────────────────────────────
  safeDelete(outputName);
  const outputSheet = workbook.addWorksheet(outputName);
  writeData(group1, outputSheet);
  writeData(group2, outputSheet, true);

  // ── 7. Delete source sheet ────────────────────────────────────────────────
  safeDelete("Data Pull");

  // ── 8. Keep only required governance columns (header-driven) ──────────────
  const requiredHeaders = [
    "Issue MC-2",
    "Issue ID",
    "Issue Name",
    "Source",
    "MC-3 Name",
    "Issue Status",
    "issue date opened",
    "Issue Due Date",
    "MAP MC2",
    "MAP Owner",
    "MAP Status",
    "MAP ID",
    "MAP Name",
    "MAP opened date",
    "MAP Due Date",
    "AP Status2",
    "Summary Update",
    "Finalized MAP Date",
    "Issue – Farthest date"
  ];

  const used = outputSheet.getUsedRange();
  if (!used) throw new Error("Output sheet has no data.");

  const outValues = used.getValues() as (string | number | boolean)[][];
  const colIndexMap = new Map<string, number>();
  (outValues[0] as string[]).forEach((h, i) => colIndexMap.set(String(h).trim(), i));

  const trimmed: (string | number | boolean)[][] = [requiredHeaders];
  for (let r = 1; r < outValues.length; r++) {
    trimmed.push(
      requiredHeaders.map(h => {
        const idx = colIndexMap.get(h);
        return idx !== undefined ? outValues[r][idx] : "";
      })
    );
  }

  outputSheet.getUsedRange()?.clear(ExcelScript.ClearApplyTo.all);
  outputSheet.getRangeByIndexes(0, 0, trimmed.length, trimmed[0].length).setValues(trimmed);

  // ── 9. Re-apply date formatting ───────────────────────────────────────────
  const finalUsed = outputSheet.getUsedRange();
  if (!finalUsed) return;

  const finalHeaderIndex = new Map<string, number>();
  (finalUsed.getRow(0).getValues()[0] as string[]).forEach((h, i) => {
    finalHeaderIndex.set(normalizeHeader(String(h)), i);
  });

  for (const header of dateColumns) {
    const colIdx = finalHeaderIndex.get(normalizeHeader(header));
    if (colIdx === undefined) continue;
    outputSheet
      .getRangeByIndexes(1, colIdx, finalUsed.getRowCount() - 1, 1)
      .setNumberFormat("mm/dd/yyyy");
  }

  outputSheet.activate();
}
