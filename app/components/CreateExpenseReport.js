"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { generateHTMLReport } from "../utils/reportGenerator";

export default function CreateExpenseReport({ session, onSuccess }) {
  const [expenses, setExpenses] = useState([]);
  const [existingReports, setExistingReports] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reportName, setReportName] = useState("");
  const [generating, setGenerating] = useState(false);

  // Filter states
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterKids, setFilterKids] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterReimbursedReq, setFilterReimbursedReq] = useState("");
  const [filterReimbursedGranted, setFilterReimbursedGranted] = useState("");

  useEffect(() => {
    loadExpenses();
    loadExistingReports();
  }, []);

  async function loadExistingReports() {
    const { data, error } = await supabase
      .from("expense_report")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (!error) {
      setExistingReports(data || []);
    }
  }

  async function viewReportFile(reportId) {
    const path = `${session.user.id}/reports/${reportId}.html`;
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, 60, {
        download: false
      });

    if (error) {
      alert("Could not find the HTML report file.");
    } else {
      window.open(data.signedUrl, "_blank");
    }
  }

  async function deleteReport(reportId) {
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;

    // 1. Before deleting, find all expenses linked to THIS report
    const { data: linkedExpenses } = await supabase
      .from("expense_to_expense_report")
      .select("expense_id")
      .eq("report_id", reportId);

    const expenseIds = linkedExpenses?.map(link => link.expense_id) || [];

    // 2. Supabase will automatically cascade and delete the mapped rows in `expense_to_expense_report`
    const { error: dbError } = await supabase
      .from("expense_report")
      .delete()
      .eq("id", reportId);

    if (dbError) {
      alert("Failed to delete report: " + dbError.message);
      return;
    }

    // 3. For all expenses that were in this report, check if they exist in ANY OTHER report
    if (expenseIds.length > 0) {
      const { data: stillLinked } = await supabase
        .from("expense_to_expense_report")
        .select("expense_id")
        .in("expense_id", expenseIds);

      const stillLinkedIds = new Set(stillLinked?.map(link => link.expense_id) || []);
      const completelyOrphanedIds = expenseIds.filter(id => !stillLinkedIds.has(id));

      // 4. Update the orphaned expenses to reimbursement_requested = false
      if (completelyOrphanedIds.length > 0) {
        await supabase
          .from("expense")
          .update({ reimbursement_requested: false })
          .in("id", completelyOrphanedIds);
      }
    }

    // 5. Delete the HTML file from storage
    const path = `${session.user.id}/reports/${reportId}.html`;
    await supabase.storage.from("receipts").remove([path]);

    // Refresh the UI
    loadExistingReports();
    loadExpenses(); // Refresh expenses in case they reappeared in the "outstanding" list
  }

  async function loadExpenses() {
    const { data, error } = await supabase
      .from("expense")
      .select("*")
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

  const uniqueChildNames = [...new Set(expenses.map(e => e.child ? `${e.child.first_name} ${e.child.last_name}`.trim() : "").filter(Boolean))];

  const handleKidInputChange = (e) => {
    const val = e.target.value;
    if (val && !filterKids.includes(val)) {
      setFilterKids([...filterKids, val]);
    }
  };

  const removeKidFilter = (kidToRemove) => {
    setFilterKids(filterKids.filter(k => k !== kidToRemove));
  };

  const removeCategoryFilter = (catToRemove) => {
    setFilterCategories(filterCategories.filter(c => c !== catToRemove));
  };

  const filteredExpenses = expenses.filter((e) => {
    const kidName = e.child ? `${e.child.first_name} ${e.child.last_name}`.trim() : "";
    const dateFormatted = new Date(e.created_at).toISOString().slice(0, 10);

    if (filterCategories.length > 0 && !filterCategories.includes(e.category)) return false;
    if (filterKids.length > 0 && !filterKids.includes(kidName)) return false;
    if (filterStartDate && dateFormatted < filterStartDate) return false;
    if (filterEndDate && dateFormatted > filterEndDate) return false;
    if (filterReimbursedReq === "yes" && !e.reimbursement_requested) return false;
    if (filterReimbursedReq === "no" && e.reimbursement_requested) return false;
    if (filterReimbursedGranted === "yes" && !e.reimbursement_granted) return false;
    if (filterReimbursedGranted === "no" && e.reimbursement_granted) return false;
    return true;
  });

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
      const htmlContent = await generateHTMLReport(supabase, selectedExpensesList, finalReportName);
      
      const blob = new Blob([htmlContent], { type: "text/html" });
      const path = `${session.user.id}/reports/${reportData.id}.html`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, blob, {
          contentType: "text/html; charset=utf-8",
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
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-primary-strong">Create Expense Report</h2>
        
        {expenses.length === 0 ? (
          <p className="text-sm text-muted">No outstanding expenses to report. All expenses have already had a reimbursement requested!</p>
        ) : (
          <form onSubmit={handleGenerateReport} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Report Name (Optional)</label>
              <input
                type="text"
                placeholder={`Expense Report - ${new Date().toLocaleDateString()}`}
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            
            <div>
              <p className="mb-2 text-sm font-medium text-primary-strong">Filter Expenses</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface px-1 py-1 focus-within:ring-2 focus-within:ring-accent">
                  {filterCategories.map(cat => (
                    <span key={cat} className="flex items-center gap-1 bg-accent-soft text-primary-strong px-2 py-0.5 rounded text-xs capitalize">
                      {cat === "education" ? "Education" : "Aftercare"}
                      <button type="button" onClick={() => removeCategoryFilter(cat)} className="hover:text-error font-bold" title="Remove filter">×</button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !filterCategories.includes(val)) {
                        setFilterCategories([...filterCategories, val]);
                      }
                    }}
                    className="bg-transparent px-1 text-sm outline-none"
                  >
                    <option value="" disabled hidden>{filterCategories.length === 0 ? "Filter category..." : "Add category..."}</option>
                    {!filterCategories.includes("education") && <option value="education">Education</option>}
                    {!filterCategories.includes("aftercare") && <option value="aftercare">Aftercare</option>}
                  </select>
                </div>
                
                <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface px-1 py-1 focus-within:ring-2 focus-within:ring-accent">
                  {filterKids.map(kid => (
                    <span key={kid} className="flex items-center gap-1 bg-accent-soft text-primary-strong px-2 py-0.5 rounded text-xs">
                      {kid} 
                      <button type="button" onClick={() => removeKidFilter(kid)} className="hover:text-error font-bold" title="Remove filter">×</button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={handleKidInputChange}
                    className="bg-transparent px-1 text-sm outline-none min-w-[120px]"
                  >
                    <option value="" disabled hidden>{filterKids.length === 0 ? "Filter child..." : "Add child..."}</option>
                    {uniqueChildNames.filter(n => !filterKids.includes(n)).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    title="Start date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <span className="text-muted text-sm">-</span>
                  <input
                    type="date"
                    title="End date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <select
                  value={filterReimbursedReq}
                  onChange={(e) => setFilterReimbursedReq(e.target.value)}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Reimbursement Req: Any</option>
                  <option value="yes">Requested</option>
                  <option value="no">Not Requested</option>
                </select>
                <select
                  value={filterReimbursedGranted}
                  onChange={(e) => setFilterReimbursedGranted(e.target.value)}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Reimbursement Received: Any</option>
                  <option value="yes">Received</option>
                  <option value="no">Not Received</option>
                </select>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-primary-strong">Select Expenses to Include</p>
              <div className="rounded-md border border-border divide-y divide-border max-h-96 overflow-y-auto">
                {filteredExpenses.length === 0 && (
                  <p className="p-3 text-sm text-muted">No expenses match these filters.</p>
                )}
                {filteredExpenses.map((e) => (
                  <label key={e.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent-soft transition">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(e.id)}
                      onChange={() => toggleSelection(e.id)}
                      className="mt-1 self-start"
                    />
                    <div className="flex-1 flex justify-between text-sm">
                      <div>
                        <span className="font-medium">{e.child ? `${e.child.first_name} ${e.child.last_name}` : "Unknown"}</span>
                        <span className="text-muted ml-2 capitalize">— {e.category}</span>
                        {e.description && <div className="text-xs text-muted mt-1">{e.description}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${Number(e.amount).toFixed(2)}</div>
                        <div className="text-xs text-muted">{new Date(e.created_at).toISOString().slice(0,10)}</div>
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
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:opacity-50"
              >
                {generating ? "Generating..." : `Generate Report (${selectedIds.length} selected)`}
              </button>
            </div>
          </form>
        )}
      </div>

      {existingReports.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-primary-strong">Past Expense Reports</h2>
          <div className="rounded-md border border-border divide-y divide-border">
            {existingReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="font-medium">{report.name}</div>
                  <div className="text-xs text-muted">
                    Created: {new Date(report.created_at).toLocaleDateString()}
                    <span className="mx-2">•</span>
                    Status: <span className="capitalize">{report.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewReportFile(report.id)}
                    className="rounded-md bg-accent-soft px-3 py-1.5 text-xs font-semibold text-primary-strong hover:bg-border transition"
                  >
                    View Report
                  </button>
                  <button
                    onClick={() => deleteReport(report.id)}
                    className="text-xs font-semibold text-muted hover:text-error-strong transition ml-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}