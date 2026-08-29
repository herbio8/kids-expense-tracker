"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import EditExpense from "./EditExpense";

export default function ExpenseList({ session }) {
  const [expenses, setExpenses] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterKids, setFilterKids] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterReimbursedReq, setFilterReimbursedReq] = useState("");
  const [filterReimbursedGranted, setFilterReimbursedGranted] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState(null);

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

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const pendingReimbursement = expenses
    .filter((e) => e.reimbursement_requested && !e.reimbursement_granted)
    .reduce((s, e) => s + Number(e.amount), 0);

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

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Filtered total" value={total} />
        <StatCard label="All-time total" value={expenses.reduce((s, e) => s + Number(e.amount), 0)} />
        <StatCard label="Awaiting reimbursement" value={pendingReimbursement} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-1 focus-within:ring-2 focus-within:ring-[var(--color-accent)]">
          {filterCategories.map(cat => (
            <span key={cat} className="flex items-center gap-1 bg-[var(--color-accent-soft)] text-[var(--color-primary-strong)] px-2 py-0.5 rounded text-xs capitalize">
              {cat === "education" ? "Education" : "Aftercare"}
              <button onClick={() => removeCategoryFilter(cat)} className="hover:text-red-500 font-bold" title="Remove filter">×</button>
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
        
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-1 focus-within:ring-2 focus-within:ring-[var(--color-accent)]">
          {filterKids.map(kid => (
            <span key={kid} className="flex items-center gap-1 bg-[var(--color-accent-soft)] text-[var(--color-primary-strong)] px-2 py-0.5 rounded text-xs">
              {kid} 
              <button onClick={() => removeKidFilter(kid)} className="hover:text-red-500 font-bold" title="Remove filter">×</button>
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
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <span className="text-[var(--color-muted)] text-sm">-</span>
          <input
            type="date"
            title="End date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
        <select
          value={filterReimbursedReq}
          onChange={(e) => setFilterReimbursedReq(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="">Reimbursement Req: Any</option>
          <option value="yes">Requested</option>
          <option value="no">Not Requested</option>
        </select>
        <select
          value={filterReimbursedGranted}
          onChange={(e) => setFilterReimbursedGranted(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="">Reimbursement Received: Any</option>
          <option value="yes">Received</option>
          <option value="no">Not Received</option>
        </select>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--color-muted)]">No expenses match these filters.</p>
        )}
        {filtered.map((e) => {
          const isEditingThis = editingExpenseId === e.id;
          const isEditingOther = editingExpenseId !== null && !isEditingThis;
          
          return (
          <div key={e.id} className={isEditingOther ? "opacity-40 pointer-events-none grayscale transition" : "transition"}>
            {isEditingThis ? (
              <EditExpense
                expense={e}
                session={session}
                onSave={() => {
                  setEditingExpenseId(null);
                  loadExpenses();
                }}
                onCancel={() => setEditingExpenseId(null)}
              />
            ) : (
              <div className="flex items-center justify-between p-3 text-sm hover:bg-[var(--color-accent-soft)] transition">
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
                    <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] mt-1">
                      <span>{new Date(e.created_at).toISOString().slice(0, 10)}</span>
                      {e.receipt_url && (
                        <button onClick={() => viewReceipt(e.receipt_url)} className="underline">
                          Receipt
                        </button>
                      )}
                      {e.invoice_url && (
                        <button onClick={() => viewReceipt(e.invoice_url)} className="underline">
                          Invoice
                        </button>
                      )}
                      {e.proof_of_payment_url && (
                        <button onClick={() => viewReceipt(e.proof_of_payment_url)} className="underline">
                          Proof of Payment
                        </button>
                      )}
                      <span className="ml-2 border-l border-gray-300 pl-2">
                        Req: {e.reimbursement_requested ? <span className="text-green-600 font-medium">Yes</span> : "No"}
                      </span>
                      <span>
                        Rcvd: {e.reimbursement_granted ? <span className="text-green-600 font-medium">Yes</span> : "No"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">${Number(e.amount).toFixed(2)}</span>
                  <button onClick={() => setEditingExpenseId(e.id)} className="text-[var(--color-primary)] hover:text-[var(--color-primary-strong)] ml-4 text-xs font-semibold">
                    Edit
                  </button>
                  <button onClick={() => deleteExpense(e.id)} className="text-[var(--color-muted)] hover:text-red-600 ml-2 font-bold">
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
          );
        })}
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