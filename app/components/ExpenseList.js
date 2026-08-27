"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterKid, setFilterKid] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterReimbursed, setFilterReimbursed] = useState("");

  useEffect(() => {
    loadExpenses();
  }, []);

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
      const { data: kidsData, error: kidsError } = await supabase
        .from("child")
        .select("id, first_name, last_name")
        .in("id", kidIds);

      if (!kidsError) {
        kidLookup = Object.fromEntries((kidsData || []).map((kid) => [kid.id, kid]));
      }
    }

    setExpenses(
      expenseRows.map((expense) => ({
        ...expense,
        child: expense.child_id ? kidLookup[expense.child_id] || null : null,
      }))
    );
  }

  async function toggleReimbursed(expense) {
    const { error } = await supabase
      .from("expense")
      .update({
        reimbursement_requested: !expense.reimbursement_requested,
      })
      .eq("id", expense.id);

    if (!error) loadExpenses();
  }

  async function deleteExpense(id) {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expense").delete().eq("id", id);
    if (!error) loadExpenses();
  }

  async function viewReceipt(path) {
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, 60);

    if (!error) window.open(data.signedUrl, "_blank");
  }

  const filtered = expenses.filter((e) => {
    const kidName = e.child ? `${e.child.first_name} ${e.child.last_name}`.trim() : "";
    const dateFormatted = new Date(e.created_at).toISOString().slice(0, 10);

    if (filterCategory && e.category !== filterCategory) return false;
    if (filterKid && !kidName.toLowerCase().includes(filterKid.toLowerCase())) return false;
    if (filterDate && dateFormatted !== filterDate) return false;
    if (filterReimbursed === "yes" && !e.reimbursement_requested) return false;
    if (filterReimbursed === "no" && e.reimbursement_requested) return false;
    return true;
  });

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const pendingReimbursement = expenses
    .filter((e) => e.reimbursement_requested && !e.reimbursement_granted)
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Filtered total" value={total} />
        <StatCard label="All-time total" value={expenses.reduce((s, e) => s + Number(e.amount), 0)} />
        <StatCard label="Awaiting reimbursement" value={pendingReimbursement} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="">All categories</option>
          <option value="education">Education</option>
          <option value="aftercare">Aftercare</option>
        </select>
        <input
          type="text"
          placeholder="Filter by child"
          value={filterKid}
          onChange={(e) => setFilterKid(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <input
          type="date"
          placeholder="Filter by date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <select
          value={filterReimbursed}
          onChange={(e) => setFilterReimbursed(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="">Reimbursement: any</option>
          <option value="yes">Requested</option>
          <option value="no">Not requested</option>
        </select>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--color-muted)]">No expenses match these filters.</p>
        )}
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center justify-between p-3 text-sm">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-md px-2 py-0.5 text-xs ${
                  e.category === "education"
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-primary-strong)]"
                    : "bg-[#f1e8db] text-[#7a5f3c]"
                }`}
              >
                {e.category === "education" ? "Education" : "Aftercare"}
              </span>
              <div>
                <div>
                  {e.child ? `${e.child.first_name} ${e.child.last_name}` : "Unspecified"}
                  {e.description ? ` — ${e.description}` : ""}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span>{new Date(e.created_at).toISOString().slice(0, 10)}</span>
                  {e.receipt_url && (
                    <button onClick={() => viewReceipt(e.receipt_url)} className="underline">
                      Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                <input
                  type="checkbox"
                  checked={e.reimbursement_requested}
                  onChange={() => toggleReimbursed(e)}
                />
                Reimbursed
              </label>
              <span className="font-medium">${Number(e.amount).toFixed(2)}</span>
              <button onClick={() => deleteExpense(e.id)} className="text-[var(--color-muted)] hover:text-red-600">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm">
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className="text-lg font-semibold text-[var(--color-primary-strong)]">${Number(value).toFixed(2)}</div>
    </div>
  );
}