function main(workbook: ExcelScript.Workbook) {

  // ── Configuration ─────────────────────────────────────────────────────────
  // Adjust these to match your workbook's column layout and filter values.
  const personName   = "Goode, Brett";  // Name to filter by
  const flagValue    = "Y";             // Flag column value to include
  const flagColIdx   = 38;              // 0-based column index for Y/N flag (col AM)
  const nameColIdx1  = 33;              // 0-based column index for name in Group 1 filter (col AH)
  const nameColIdx2  = 8;               // 0-based column index for name in Group 2 filter (col I)
  const outputName   = "Issues & MAPs";

  // All auxiliary sheets to remove before processing; missing ones are skipped.
  const sheetsToRemove = [
    "Data Pull - MAP Compliance",
    "Gov calls",
    "Issues with No MAPs",
    "Overview ",
    "Issues with one MAP",
    "Issue baseline (6-5)",
    "Dashboard",
    "Sheet4",
    "Overview - Arun",
    "Other",
    "Issue-RISK",
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────

  function safeDelete(name: string): void {
    const sheet = workbook.getWorksheet(name);
    if (sheet) sheet.delete();
  }

  // Returns the autofilter range, initialising the filter on the used range
  // header if it hasn't been set up yet.
  function getFilterRange(sheet: ExcelScript.Worksheet): ExcelScript.Range {
    const af = sheet.getAutoFilter();
    const existing = af.getRange();
    if (existing) return existing;

    const used = sheet.getUsedRange();
    if (!used) throw new Error(`Sheet "${sheet.getName()}" has no data.`);
    // Initialise autofilter on the full used range
    af.apply(used);
    return af.getRange();
  }

  // Copies all visible (non-filtered-out) rows from src into dst at A1.
  // If no autofilter is active every row is treated as visible.
  function copyVisibleRows(
    src: ExcelScript.Worksheet,
    dst: ExcelScript.Worksheet
  ): void {
    const used = src.getUsedRange();
    if (!used) return;

    let visible: ExcelScript.RangeAreas;
    try {
      visible = used.getSpecialCells(ExcelScript.SpecialCellType.visible);
    } catch {
      return; // Nothing visible
    }

    dst.getRange("A1").copyFrom(
      visible,
      ExcelScript.RangeCopyType.all,
      false,
      false
    );
    
    }

  // Appends all data rows (skipping the header) from src to the bottom of dst.
  function appendDataRows(
    src: ExcelScript.Worksheet,
    dst: ExcelScript.Worksheet
  ): void {
    const srcUsed = src.getUsedRange();
    if (!srcUsed || srcUsed.getRowCount() < 2) return;

    const allValues  = srcUsed.getValues() as (string | number | boolean)[][];
    const allFormats = srcUsed.getNumberFormats() as string[][];
    const dataValues  = allValues.slice(1);
    const dataFormats = allFormats.slice(1);
    if (dataValues.length === 0) return;

    const colCount  = dataValues[0].length;
    const dstUsed   = dst.getUsedRange();
    const startRow  = dstUsed ? dstUsed.getRowCount() : 0;

    dst.getRangeByIndexes(startRow, 0, dataValues.length,  colCount).setValues(dataValues);
    dst.getRangeByIndexes(startRow, 0, dataFormats.length, colCount).setNumberFormats(dataFormats);
  }

  // ── 1. Capture source sheet before any deletes ────────────────────────────
  const sourceSheet = workbook.getActiveWorksheet();

  // ── 2. Remove auxiliary sheets ────────────────────────────────────────────
  for (const name of sheetsToRemove) safeDelete(name);

  // ── 3. Group 1 — flag = Y  AND  name matches on nameColIdx1 ──────────────
  const af1 = sourceSheet.getAutoFilter();
  const fr1 = getFilterRange(sourceSheet);

  af1.clearCriteria();
  af1.apply(fr1, flagColIdx,  { filterOn: ExcelScript.FilterOn.values, values: [flagValue]  });
  af1.apply(fr1, nameColIdx1, { filterOn: ExcelScript.FilterOn.values, values: [personName] });

  safeDelete("Group 1");
  const group1 = workbook.addWorksheet("Group 1");
  copyVisibleRows(sourceSheet, group1);

  // ── 4. Group 2 — name matches on nameColIdx2  AND  flag = Y ──────────────
  af1.clearCriteria();
  af1.apply(fr1, nameColIdx2, { filterOn: ExcelScript.FilterOn.values, values: [personName] });
  af1.apply(fr1, flagColIdx,  { filterOn: ExcelScript.FilterOn.values, values: [flagValue]  });

  safeDelete("Group 2");
  const group2 = workbook.addWorksheet("Group 2");
  copyVisibleRows(sourceSheet, group2);

  af1.clearCriteria();

  // ── 5. Merge into output sheet ────────────────────────────────────────────
  safeDelete(outputName);
  const outputSheet = workbook.addWorksheet(outputName);

  copyVisibleRows(group1, outputSheet); // Full copy of Group 1 (header + data)
  appendDataRows(group2, outputSheet);  // Append Group 2 data rows (no duplicate header)

  // ── 6. Tear down temp sheets and source sheet ─────────────────────────────
  // group1.delete();
  // group2.delete();
  safeDelete("Data Pull");

  // ── 7. Land on the finished sheet ─────────────────────────────────────────
  outputSheet.activate();
}

