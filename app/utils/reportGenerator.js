export function generateHTMLReport(selectedExpensesList, finalReportName) {
  const grouped = selectedExpensesList.reduce((acc, exp) => {
    const kidName = exp.child ? `${exp.child.first_name} ${exp.child.last_name}`.trim() : "Unspecified";
    if (!acc[kidName]) acc[kidName] = [];
    acc[kidName].push(exp);
    return acc;
  }, {});

  let html = `<!DOCTYPE html><html><head><title>${finalReportName}</title>
  <style>
    :root {
      --primary: #4f46e5;
      --text-main: #111827;
      --text-muted: #6b7280;
      --bg-main: #f3f4f6;
      --bg-card: #ffffff;
      --border: #e5e7eb;
    }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg-main);
      color: var(--text-main);
      padding: 40px 20px;
      margin: 0;
      line-height: 1.5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: var(--bg-card);
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--border);
    }
    h1 {
      font-size: 2.25rem;
      margin: 0 0 10px 0;
      color: var(--text-main);
    }
    .date-badge {
      display: inline-block;
      background-color: #f3f4f6;
      color: var(--text-muted);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .section {
      margin-bottom: 40px;
    }
    h2 {
      font-size: 1.5rem;
      color: var(--primary);
      margin-top: 0;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      background-color: #f8fafc;
      font-weight: 600;
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    tbody tr:hover {
      background-color: #f9fafb;
    }
    .text-right {
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      background-color: #e0e7ff;
      color: #3730a3;
      text-transform: capitalize;
    }
    .attachment {
      color: #059669;
      font-weight: 600;
      font-size: 0.875rem;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid var(--border);
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 20px;
    }
    .grand-total {
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary);
    }
    .tfoot-row th {
      background-color: #f8fafc;
      color: var(--text-main);
      font-weight: 700;
      font-size: 1rem;
      border-top: 2px solid var(--border);
      border-bottom: none;
    }
  </style></head><body>
  <div class="container">
    <div class="header">
      <h1>${finalReportName}</h1>
      <div class="date-badge">Generated on ${new Date().toLocaleDateString()}</div>
    </div>`;

  let grandTotal = 0;

  for (const [kidName, exps] of Object.entries(grouped)) {
    html += `<div class="section">`;
    html += `<h2>${kidName}</h2>`;
    html += `<table><thead><tr>
      <th>Date</th>
      <th>Category</th>
      <th>Description</th>
      <th>Docs Attached</th>
      <th class="text-right">Amount</th>
    </tr></thead><tbody>`;
    
    let kidTotal = 0;
    for (const exp of exps) {
      kidTotal += Number(exp.amount);
      const date = new Date(exp.created_at).toISOString().slice(0, 10);
      
      let docs = [];
      if (exp.receipt_url) docs.push("Receipt");
      if (exp.invoice_url) docs.push("Invoice");
      if (exp.proof_of_payment_url) docs.push("Proof");
      const docsStr = docs.length > 0 ? `<span class="attachment">${docs.join(", ")}</span>` : `<span style="color: #9ca3af; font-size: 0.875rem;">None</span>`;

      html += `<tr>
        <td>${date}</td>
        <td><span class="badge">${exp.category}</span></td>
        <td style="color: #4b5563;">${exp.description || "-"}</td>
        <td>${docsStr}</td>
        <td class="text-right font-semibold">$${Number(exp.amount).toFixed(2)}</td>
      </tr>`;
    }
    grandTotal += kidTotal;
    html += `</tbody><tfoot class="tfoot-row"><tr><th colspan="4" class="text-right">Total for ${kidName}:</th><th class="text-right">$${kidTotal.toFixed(2)}</th></tr></tfoot></table>`;
    html += `</div>`;
  }
  
  html += `<div class="footer">
    <div style="font-size: 1.25rem; font-weight: 600; color: #4b5563;">Grand Total:</div>
    <div class="grand-total">$${grandTotal.toFixed(2)}</div>
  </div>`;
  
  html += `</div></body></html>`;
  return html;
}
