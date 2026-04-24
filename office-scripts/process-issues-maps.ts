function main(workbook: ExcelScript.Workbook) {

  // ── Configuration ─────────────────────────────────────────────────────────
  // Adjust these to match your workbook's column layout.
  const personName               = "Goode, Brett";  // Person to filter by
  const flagValue                = "Y";             // Required flag value (Group 1 only)
  const discussionNeeded               = 38;              // 0-based: Y/N flag column (col AM)
  const discussionMc2LeaderColIdx = 33;             // 0-based: discussionMc2Leader column (col AH)
  const mc2leaderColIdx          = 8;               // 0-based: mc2leader column (col I)
  const outputName               = "Issues & MAPs";

  // Auxiliary sheets to remove before processing; missing ones are silently skipped.
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

  // Replaces all formulas/Power Query results with their current computed values
  // so subsequent filters operate on stable, non-refreshing data.
  function snapshotAsValues(sheet: ExcelScript.Worksheet): void {
    for (const table of sheet.getTables()) {
      table.convertToRange();
    }
    const used = sheet.getUsedRange();
    if (!used) return;
    const values  = used.getValues();
    const formats = used.getNumberFormats();
    used.setValues(values  as (string | number | boolean)[][]);
    used.setNumberFormats(formats as string[][]);
  }

  // Ensures an AutoFilter is initialised on the sheet and returns its range.
  function ensureAutoFilter(sheet: ExcelScript.Worksheet): ExcelScript.Range {
    const af = sheet.getAutoFilter();
    const existing = af.getRange();
    if (existing) return existing;
    const used = sheet.getUsedRange();
    if (!used) throw new Error(`Sheet "${sheet.getName()}" has no data.`);
    af.apply(used);
    return af.getRange();
  }

  // Returns values and number formats for every currently-visible row.
  // Collects row indices from the RangeAreas directly so the output is always
  // contiguous — no blank rows regardless of which rows the filter hides.
  // When skipFirstRow=true the header (row 0 of the used range) is omitted.
  function collectVisible(
    sheet: ExcelScript.Worksheet,
    skipFirstRow: boolean = false
  ): { values: (string | number | boolean)[][], formats: string[][] } {
    const used = sheet.getUsedRange();
    if (!used) return { values: [], formats: [] };

    const allValues  = used.getValues()        as (string | number | boolean)[][];
    const allFormats = used.getNumberFormats() as string[][];

    let areas: ExcelScript.RangeAreas;
    try {
      areas = used.getSpecialCells(ExcelScript.SpecialCellType.visible);
    } catch {
      return { values: [], formats: [] };
    }

    // Convert absolute row indices to used-range-relative indices.
    const base = used.getRowIndex();
    const seen = new Set<number>();
    for (const area of areas.getAreas()) {
      const rel = area.getRowIndex() - base;
      for (let r = 0; r < area.getRowCount(); r++) seen.add(rel + r);
    }

    const indices = Array.from(seen)
      .sort((a, b) => a - b)
      .filter(i => i >= (skipFirstRow ? 1 : 0));

    return {
      values:  indices.map(i => allValues[i]),
      formats: indices.map(i => allFormats[i]),
    };
  }

  // Writes a collected dataset to dst.
  // append=true places data immediately after existing content (no gap).
  function writeData(
    data: { values: (string | number | boolean)[][], formats: string[][] },
    dst: ExcelScript.Worksheet,
    append: boolean = false
  ): void {
    const { values, formats } = data;
    if (values.length === 0) return;
    const cols    = values[0].length;
    const dstUsed = dst.getUsedRange();
    const row     = (append && dstUsed) ? dstUsed.getRowCount() : 0;
    dst.getRangeByIndexes(row, 0, values.length,  cols).setValues(values);
    dst.getRangeByIndexes(row, 0, formats.length, cols).setNumberFormats(formats);
  }

  // ── 1. Freeze source data as static values ────────────────────────────────
  // Must run before any filtering so Power Query / formula results are stable.
  const sourceSheet = workbook.getActiveWorksheet();
  snapshotAsValues(sourceSheet);

  // ── 2. Remove auxiliary sheets ────────────────────────────────────────────
  for (const name of sheetsToRemove) safeDelete(name);

  // ── 3. Group 1 — flag = Y  AND  discussionMc2Leader = personName ──────────
  const af = sourceSheet.getAutoFilter();
  const fr = ensureAutoFilter(sourceSheet);

  af.clearCriteria();
  af.apply(fr, discussionNeeded,                { filterOn: ExcelScript.FilterOn.values, values: [flagValue]   });
  af.apply(fr, discussionMc2LeaderColIdx, { filterOn: ExcelScript.FilterOn.values, values: [personName]  });

  const group1 = collectVisible(sourceSheet);       // includes header row

  // ── 4. Group 2 — mc2leader = personName  AND  discussionMc2Leader ≠ personName ──
  af.clearCriteria();
  af.apply(fr, discussionNeeded, { filterOn: ExcelScript.FilterOn.values, values: [flagValue] });
  af.apply(fr, mc2leaderColIdx,           { filterOn: ExcelScript.FilterOn.values, values: [personName] });
  af.apply(fr, discussionMc2LeaderColIdx, { filterOn: ExcelScript.FilterOn.custom, criterion1: `<>${personName}` });

  const group2 = collectVisible(sourceSheet, true); // skips header row (already in group1)

  af.clearCriteria();

  // ── 5. Write output — Group 1 then Group 2, guaranteed no blank rows ───────
  safeDelete(outputName);
  const outputSheet = workbook.addWorksheet(outputName);
  writeData(group1, outputSheet);               // header + Group 1 data rows
  writeData(group2, outputSheet, true);         // Group 2 data rows appended immediately after

  // ── 6. Delete source sheet ────────────────────────────────────────────────
  safeDelete("Data Pull");

  // ── 7. Activate output ────────────────────────────────────────────────────
  outputSheet.activate();
}


