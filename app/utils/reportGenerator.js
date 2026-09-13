import ExcelJS from "exceljs";

export async function generateExcelReport(supabase, selectedExpensesList, finalReportName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kids Expense Tracker";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Expense Report", {
    views: [{ showGridLines: true }],
  });

  // Column definitions with widths and alignments
  worksheet.columns = [
    { key: "child", width: 22 },
    { key: "date", width: 14 },
    { key: "category", width: 16 },
    { key: "description", width: 36 },
    { key: "amount", width: 18 },
    { key: "receipt", width: 18 },
    { key: "invoice", width: 18 },
    { key: "proof", width: 20 },
  ];

  async function getSignedUrl(path) {
    if (!path) return null;
    // Generate a signed URL valid for 30 days
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 2592000);
    if (error || !data) return null;
    return data.signedUrl;
  }

  // Theme palette (matching the app's warm organic aesthetic)
  const colors = {
    primaryDark: "6F5339",   // Dark warm brown (Header & Grand Total)
    primaryMid: "8A6A4B",    // Brand primary
    accentSoft: "F6DFC9",    // Warm soft peach (Subtotals)
    accentBorder: "D8A77A",  // Accent border
    textDark: "4A3B2F",      // Main text
    textMuted: "8F7D6F",     // Muted text
    borderLight: "E8DCCF",   // Cell border
    bgZebra: "FDFBF7",       // Alternating row background
    linkBlue: "2563EB",      // Clickable link blue
    white: "FFFFFF",
  };

  const thinBorder = {
    top: { style: "thin", color: { argb: `FF${colors.borderLight}` } },
    left: { style: "thin", color: { argb: `FF${colors.borderLight}` } },
    bottom: { style: "thin", color: { argb: `FF${colors.borderLight}` } },
    right: { style: "thin", color: { argb: `FF${colors.borderLight}` } },
  };

  // Row 1: Spacing
  worksheet.addRow([]);
  worksheet.getRow(1).height = 10;

  // Row 2: Title Banner
  const titleRow = worksheet.addRow([finalReportName]);
  titleRow.height = 32;
  worksheet.mergeCells("A2:H2");
  const titleCell = worksheet.getCell("A2");
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: `FF${colors.textDark}` } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };

  // Row 3: Subtitle / Metadata
  const subtitleRow = worksheet.addRow([`Generated on ${new Date().toLocaleDateString()}  •  Kids Expense Tracker`]);
  subtitleRow.height = 18;
  worksheet.mergeCells("A3:H3");
  const subtitleCell = worksheet.getCell("A3");
  subtitleCell.font = { name: "Arial", size: 9, italic: true, color: { argb: `FF${colors.textMuted}` } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left" };

  // Row 4: Spacing
  worksheet.addRow([]);
  worksheet.getRow(4).height = 10;

  // Row 5: Table Header
  const headers = [
    "Child Name",
    "Date",
    "Category",
    "Description",
    "Amount",
    "Receipt",
    "Invoice",
    "Proof of Payment",
  ];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;

  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${colors.primaryDark}` },
    };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${colors.white}` } };
    cell.alignment = {
      vertical: "middle",
      horizontal: colNumber === 1 || colNumber === 4 ? "left" : colNumber === 5 ? "right" : "center",
    };
    cell.border = {
      top: { style: "thin", color: { argb: `FF${colors.primaryDark}` } },
      left: { style: "thin", color: { argb: `FF${colors.primaryDark}` } },
      bottom: { style: "medium", color: { argb: `FF${colors.primaryMid}` } },
      right: { style: "thin", color: { argb: `FF${colors.primaryDark}` } },
    };
  });

  // Group expenses by child name
  const grouped = selectedExpensesList.reduce((acc, exp) => {
    const kidName = exp.child ? `${exp.child.first_name} ${exp.child.last_name}`.trim() : "Unspecified";
    if (!acc[kidName]) acc[kidName] = [];
    acc[kidName].push(exp);
    return acc;
  }, {});

  const sortedKidNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  let grandTotal = 0;
  let rowIndexCounter = 0;

  for (const kidName of sortedKidNames) {
    const exps = grouped[kidName];
    exps.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let childTotal = 0;
    const childStartRow = worksheet.lastRow.number + 1;

    for (const exp of exps) {
      rowIndexCounter++;
      const amount = Number(exp.amount) || 0;
      childTotal += amount;
      const date = new Date(exp.created_at).toISOString().slice(0, 10);
      const categoryFormatted = exp.category ? exp.category.charAt(0).toUpperCase() + exp.category.slice(1) : "-";

      const receiptUrl = await getSignedUrl(exp.receipt_url);
      const invoiceUrl = await getSignedUrl(exp.invoice_url);
      const proofUrl = await getSignedUrl(exp.proof_of_payment_url);

      const row = worksheet.addRow([
        kidName,
        date,
        categoryFormatted,
        exp.description || "-",
        amount,
        receiptUrl ? { text: "View Receipt", hyperlink: receiptUrl } : "—",
        invoiceUrl ? { text: "View Invoice", hyperlink: invoiceUrl } : "—",
        proofUrl ? { text: "View Proof", hyperlink: proofUrl } : "—",
      ]);

      row.height = 24;
      const isZebra = rowIndexCounter % 2 === 0;

      row.eachCell((cell, colNumber) => {
        // Background
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isZebra ? `FF${colors.bgZebra}` : `FF${colors.white}` },
        };
        cell.border = thinBorder;

        // Alignment & Formatting
        if (colNumber === 1 || colNumber === 4) {
          cell.alignment = { vertical: "middle", horizontal: "left" };
          cell.font = { name: "Arial", size: 10, color: { argb: `FF${colors.textDark}` } };
        } else if (colNumber === 2 || colNumber === 3) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.font = { name: "Arial", size: 10, color: { argb: `FF${colors.textDark}` } };
        } else if (colNumber === 5) {
          cell.alignment = { vertical: "middle", horizontal: "right" };
          cell.font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${colors.textDark}` } };
          cell.numFmt = '"$"#,##0.00';
        } else {
          // Link cells (6, 7, 8)
          cell.alignment = { vertical: "middle", horizontal: "center" };
          if (cell.value && typeof cell.value === "object" && cell.value.hyperlink) {
            cell.font = { name: "Arial", size: 10, color: { argb: `FF${colors.linkBlue}` }, underline: true };
          } else {
            cell.font = { name: "Arial", size: 10, color: { argb: `FF${colors.textMuted}` } };
          }
        }
      });
    }

    grandTotal += childTotal;
    const childEndRow = worksheet.lastRow.number;

    // Subtotal Row for Child
    const subtotalRow = worksheet.addRow([
      `Total for ${kidName}`,
      "",
      "",
      "",
      { formula: `SUM(E${childStartRow}:E${childEndRow})`, result: childTotal },
      "",
      "",
      "",
    ]);
    subtotalRow.height = 25;

    subtotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${colors.accentSoft}` },
      };
      cell.border = {
        top: { style: "thin", color: { argb: `FF${colors.accentBorder}` } },
        bottom: { style: "thin", color: { argb: `FF${colors.accentBorder}` } },
      };

      if (colNumber === 1) {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${colors.primaryDark}` } };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      } else if (colNumber === 5) {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: `FF${colors.primaryDark}` } };
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = '"$"#,##0.00';
      }
    });

    // Blank separator row
    const spacer = worksheet.addRow([]);
    spacer.height = 12;
  }

  // Grand Total Row
  const grandTotalRow = worksheet.addRow([
    "Grand Total",
    "",
    "",
    "",
    grandTotal,
    "",
    "",
    "",
  ]);
  grandTotalRow.height = 30;

  grandTotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${colors.primaryDark}` },
    };
    cell.border = {
      top: { style: "medium", color: { argb: `FF${colors.accentBorder}` } },
      bottom: { style: "double", color: { argb: `FF${colors.accentBorder}` } },
    };

    if (colNumber === 1) {
      cell.font = { name: "Arial", size: 12, bold: true, color: { argb: `FF${colors.white}` } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    } else if (colNumber === 5) {
      cell.font = { name: "Arial", size: 12, bold: true, color: { argb: `FF${colors.white}` } };
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.numFmt = '"$"#,##0.00';
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

