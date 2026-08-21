"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  category: "Education",
  kid_id: "",
  notes: "",
  reimbursement_requested: false,
};

function isMissingColumnError(error) {
  return Boolean(
    error?.message && /could not find the '.*' column|schema cache/i.test(error.message)
  );
}

export default function Dashboard({ session }) {
  const [expenses, setExpenses] = useState([]);
  const [kids, setKids] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creatingKid, setCreatingKid] = useState(false);
  const [newKidName, setNewKidName] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterKid, setFilterKid] = useState("");
  const [filterReimbursed, setFilterReimbursed] = useState("");

  useEffect(() => {
    loadExpenses();
    loadKids();
  }, []);

  async function loadExpenses() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Failed to load expenses", error);
      return;
    }

    const expenseRows = data || [];
    const kidIds = [...new Set(expenseRows.map((expense) => expense.kid_id).filter(Boolean))];
    let kidLookup = {};

    if (kidIds.length > 0) {
      const { data: kidsData, error: kidsError } = await supabase
        .from("kids")
        .select("id, name")
        .in("id", kidIds);

      if (!kidsError) {
        kidLookup = Object.fromEntries((kidsData || []).map((kid) => [kid.id, kid]));
      }
    }

    setExpenses(
      expenseRows.map((expense) => ({
        ...expense,
        kids: expense.kid_id ? kidLookup[expense.kid_id] || null : null,
      }))
    );
  }

  async function loadKids() {
    const { data, error } = await supabase
      .from("kids")
      .select("id, name")
      .order("name", { ascending: true });

    if (!error) setKids(data || []);
  }

  async function handleAddKid(e) {
    e.preventDefault();
    const trimmedName = newKidName.trim();
    if (!trimmedName) return;

    setCreatingKid(true);
    const { data, error } = await supabase
      .from("kids")
      .insert({
        name: trimmedName,
        created_by: session.user.id,
      })
      .select("id, name")
      .single();

    setCreatingKid(false);

    if (error) {
      alert(error.message);
      return;
    }

    setKids((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewKidName("");
    setForm((prev) => ({ ...prev, kid_id: data.id }));
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    if (!form.kid_id) {
      alert("Please select a child before saving the expense.");
      return;
    }

    setSaving(true);

    try {
      const basePayload = {
        date: form.date,
        amount: Number(form.amount),
        category: form.category,
        notes: form.notes || null,
        added_by: session.user.id,
        reimbursement_requested: form.reimbursement_requested,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("expenses")
        .insert({
          ...basePayload,
          kid_id: form.kid_id || null,
        })
        .select()
        .single();

      let savedExpense = inserted;

      if (insertError && isMissingColumnError(insertError)) {
        const { data: fallbackInserted, error: fallbackError } = await supabase
          .from("expenses")
          .insert(basePayload)
          .select()
          .single();

        if (fallbackError) {
          throw fallbackError;
        }

        savedExpense = fallbackInserted;
      } else if (insertError) {
        throw insertError;
      }

      if (file && savedExpense?.id) {
        const path = `${session.user.id}/${savedExpense.id}/${file.name}`;
        try {
          const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

          if (!uploadError) {
            await supabase.from("expenses").update({ receipt_url: path }).eq("id", savedExpense.id);
          } else {
            console.error("Receipt upload failed", uploadError);
            alert("Expense was saved, but the receipt could not be uploaded: " + uploadError.message);
          }
        } catch (uploadException) {
          console.error("Receipt upload threw", uploadException);
          alert("Expense was saved, but the receipt upload failed unexpectedly.");
        }
      }

      setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
      setFile(null);
      await loadExpenses();
    } catch (err) {
      console.error("Failed to save expense", err);
      alert(err?.message || "Unexpected error while saving expense.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleReimbursed(expense) {
    const { error } = await supabase
      .from("expenses")
      .update({
        reimbursement_requested: !expense.reimbursement_requested,
        reimbursement_date: !expense.reimbursement_requested
          ? new Date().toISOString().slice(0, 10)
          : null,
      })
      .eq("id", expense.id);

    if (!error) loadExpenses();
  }

  async function deleteExpense(id) {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) loadExpenses();
  }

  async function viewReceipt(path) {
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, 60);

    if (!error) window.open(data.signedUrl, "_blank");
  }

  const filtered = expenses.filter((e) => {
    const kidName = e.kids?.name || "";

    if (filterCategory && e.category !== filterCategory) return false;
    if (filterKid && !kidName.toLowerCase().includes(filterKid.toLowerCase())) return false;
    if (filterReimbursed === "yes" && !e.reimbursement_requested) return false;
    if (filterReimbursed === "no" && e.reimbursement_requested) return false;
    return true;
  });

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const pendingReimbursement = expenses
    .filter((e) => e.reimbursement_requested && !e.reimbursement_date)
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-primary-strong)]">Kids expenses</h1>
          <p className="text-sm text-[var(--color-muted)]">Education and aftercare</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-strong)]"
        >
          Sign out
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Filtered total" value={total} />
        <StatCard label="All-time total" value={expenses.reduce((s, e) => s + Number(e.amount), 0)} />
        <StatCard label="Awaiting reimbursement" value={pendingReimbursement} />
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-[var(--color-primary-strong)]">Add child</p>
        <form onSubmit={handleAddKid} className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            placeholder="Child's name"
            value={newKidName}
            onChange={(e) => setNewKidName(e.target.value)}
            className="flex-1 min-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <button
            type="submit"
            disabled={creatingKid}
            className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:opacity-50"
          >
            {creatingKid ? "Adding..." : "Add child"}
          </button>
        </form>

        <p className="mb-3 text-sm font-semibold text-[var(--color-primary-strong)]">Add expense</p>
        <form onSubmit={handleAddExpense}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="Education">Education</option>
              <option value="Aftercare">Aftercare</option>
            </select>
            <select
              value={form.kid_id}
              onChange={(e) => setForm({ ...form, kid_id: e.target.value })}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">Select child</option>
              {kids.map((kid) => (
                <option key={kid.id} value={kid.id}>
                  {kid.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Notes (e.g. tuition, camp, supplies)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <input
                type="checkbox"
                checked={form.reimbursement_requested}
                onChange={(e) => setForm({ ...form, reimbursement_requested: e.target.checked })}
              />
              Reimbursement requested
            </label>
            <label className="text-sm text-[var(--color-muted)]">
              Receipt: {" "}
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files[0] || null)}
                className="text-xs"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add expense"}
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          <option value="">All categories</option>
          <option value="Education">Education</option>
          <option value="Aftercare">Aftercare</option>
        </select>
        <input
          type="text"
          placeholder="Filter by kid"
          value={filterKid}
          onChange={(e) => setFilterKid(e.target.value)}
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
                  e.category === "Education"
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-primary-strong)]"
                    : "bg-[#f1e8db] text-[#7a5f3c]"
                }`}
              >
                {e.category}
              </span>
              <div>
                <div>
                  {e.kids?.name || "Unspecified"}
                  {e.notes ? ` — ${e.notes}` : ""}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span>{e.date}</span>
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
