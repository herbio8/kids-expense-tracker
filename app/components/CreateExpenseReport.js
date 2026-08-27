"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CreateExpenseReport({ session, onSuccess }) {
  const [expenses, setExpenses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reportName, setReportName] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    // Only fetch expenses that haven't been requested for reimbursement yet
    const { data, error } = await supabase
      .from("expense")
      .select("*")
      .eq("reimbursement_requested", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load expenses", error);
      return;
    }

    const expenseRows = data || [];
    const kidIds = [...new Set(expenseRows.map((expense) => expense.child_id).filter(Boolean))];
    let kidLookup = {};

    if (kidIds.length > 0) {
      const { data: kidsData } = await supabase
        .from("child")
        .select("id, first_name, last_name")
        .in("id", kidIds);
      if (kidsData) {
        kidLookup = Object.fromEntries(kidsData.map((kid) => [kid.id, kid]));
      }
    }

    setExpenses(
      expenseRows.map((expense) => ({
        ...expense,
        child: expense.child_id ? kidLookup[expense.child_id] || null : null,
      }))
    );
  }

  function toggleSelection(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((eId) => eId !== id) : [...prev, id]
    );
  }

  function generateHTMLReport(selectedExpensesList, finalReportName) {
    const grouped = selectedExpensesList.reduce((acc, exp) => {
      const kidName = exp.child ? `${exp.child.first_name} ${exp.child.last_name}`.trim() : "Unspecified";
      if (!acc[kidName]) acc[kidName] = [];
      acc[kidName].push(exp);
      return acc;
    }, {});

    let html = `<!DOCTYPE html><html><head><title>${finalReportName}</title>
    <style>
      body { font-family: sans-serif; padding: 20px; color: #333; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
      th { background-color: #f9fafb; font-weight: bold; }
      .text-right { text-align: right; }
      h2 { margin-top: 30px; color: #111; border-bottom: 2px solid #eee; padding-bottom: 5px; }
    </style></head><body>`;
    
    html += `<h1>${finalReportName}</h1>`;
    html += `<p>Generated on ${new Date().toLocaleDateString()}</p>`;

    let grandTotal = 0;

    for (const [kidName, exps] of Object.entries(grouped)) {
      html += `<h2>${kidName}</h2>`;
      html += `<table><thead><tr>
        <th>Date</th>
        <th>Category</th>
        <th>Description</th>
        <th>Receipt</th>
        <th>Invoice</th>
        <th>Proof</th>
        <th class="text-right">Amount</th>
      </tr></thead><tbody>`;
      
      let kidTotal = 0;
      for (const exp of exps) {
        kidTotal += Number(exp.amount);
        const date = new Date(exp.created_at).toISOString().slice(0, 10);
        html += `<tr>
          <td>${date}</td>
          <td style="text-transform: capitalize;">${exp.category}</td>
          <td>${exp.description || ""}</td>
          <td>${exp.receipt_url ? "Attached" : ""}</td>
          <td>${exp.invoice_url ? "Attached" : ""}</td>
          <td>${exp.proof_of_payment_url ? "Attached" : ""}</td>
          <td class="text-right">$${Number(exp.amount).toFixed(2)}</td>
        </tr>`;
      }
      grandTotal += kidTotal;
      html += `</tbody><tfoot><tr><th colspan="6" class="text-right">Total for ${kidName}:</th><th class="text-right">$${kidTotal.toFixed(2)}</th></tr></tfoot></table>`;
    }
    
    html += `<h2>Grand Total: $${grandTotal.toFixed(2)}</h2>`;
    html += `</body></html>`;
    return html;
  }

  async function handleGenerateReport(e) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert("Please select at least one expense to include in the report.");
      return;
    }

    const finalReportName = reportName.trim() || `Expense Report - ${new Date().toLocaleDateString()}`;

    setGenerating(true);
    try {
      // 1. Create Report in expense_report table
      const { data: reportData, error: reportError } = await supabase
        .from("expense_report")
        .insert({
          name: finalReportName,
          parent_id: session.user.id,
          status: "submitted"
        })
        .select("id")
        .single();

      if (reportError) throw reportError;

      // 2. Link expenses to the report in expense_to_expense_report table
      const mappings = selectedIds.map((id) => ({
        report_id: reportData.id,
        expense_id: id
      }));

      const { error: mappingError } = await supabase
        .from("expense_to_expense_report")
        .insert(mappings);

      if (mappingError) throw mappingError;

      // 3. Mark the selected expenses as reimbursement_requested = true
      const { error: updateError } = await supabase
        .from("expense")
        .update({ reimbursement_requested: true })
        .in("id", selectedIds);

      if (updateError) throw updateError;

      // 4. Generate the HTML report blob and upload it to Supabase Storage
      const selectedExpensesList = expenses.filter(exp => selectedIds.includes(exp.id));
      const htmlContent = generateHTMLReport(selectedExpensesList, finalReportName);
      
      const blob = new Blob([htmlContent], { type: "text/html" });
      const path = `${session.user.id}/reports/${reportData.id}.html`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, blob, {
          contentType: "text/html",
          upsert: false
        });

      if (uploadError) {
        console.error("Failed to upload HTML report to storage", uploadError);
        alert("The report was generated in the database, but the HTML file failed to upload.");
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--color-primary-strong)]">Create Expense Report</h2>
      
      {expenses.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No outstanding expenses to report. All expenses have already had a reimbursement requested!</p>
      ) : (
        <form onSubmit={handleGenerateReport} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-muted)] mb-1">Report Name (Optional)</label>
            <input
              type="text"
              placeholder={`Expense Report - ${new Date().toLocaleDateString()}`}
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="w-full max-w-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-primary-strong)]">Select Expenses to Include</p>
            <div className="rounded-md border border-[var(--color-border)] divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
              {expenses.map((e) => (
                <label key={e.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[var(--color-accent-soft)] transition">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(e.id)}
                    onChange={() => toggleSelection(e.id)}
                    className="mt-1 self-start"
                  />
                  <div className="flex-1 flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{e.child ? `${e.child.first_name} ${e.child.last_name}` : "Unknown"}</span>
                      <span className="text-[var(--color-muted)] ml-2 capitalize">— {e.category}</span>
                      {e.description && <div className="text-xs text-[var(--color-muted)] mt-1">{e.description}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${Number(e.amount).toFixed(2)}</div>
                      <div className="text-xs text-[var(--color-muted)]">{new Date(e.created_at).toISOString().slice(0,10)}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={generating || selectedIds.length === 0}
              className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:opacity-50"
            >
              {generating ? "Generating..." : `Generate Report (${selectedIds.length} selected)`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}