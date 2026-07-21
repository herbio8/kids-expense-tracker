"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  category: "Education",
  kid_name: "",
  notes: "",
  reimbursement_requested: false,
};

export default function Dashboard({ session }) {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterKid, setFilterKid] = useState("");
  const [filterReimbursed, setFilterReimbursed] = useState("");

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    if (!error) setExpenses(data);
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);

    // 1. Insert the expense row first so we have an id to namespace the receipt under
    const { data: inserted, error: insertError } = await supabase
      .from("expenses")
      .insert({
        date: form.date,
        amount: Number(form.amount),
        category: form.category,
        kid_name: form.kid_name || null,
        notes: form.notes || null,
        added_by: session.user.id,
        reimbursement_requested: form.reimbursement_requested,
      })
      .select()
      .single();

    if (insertError) {
      alert(insertError.message);
      setSaving(false);
      return;
    }

    // 2. If a receipt file was attached, upload it and save its storage path
    if (file) {
      const path = `${session.user.id}/${inserted.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, file);

      if (!uploadError) {
        await supabase
          .from("expenses")
          .update({ receipt_url: path })
          .eq("id", inserted.id);
      } else {
        alert("Expense saved, but receipt upload failed: " + uploadError.message);
      }
    }

    setForm(emptyForm);
    setFile(null);
    setSaving(false);
    loadExpenses();
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
      .createSignedUrl(path, 60); // link valid for 60 seconds
    if (!error) window.open(data.signedUrl, "_blank");
  }

  const filtered = expenses.filter((e) => {
    if (filterCategory && e.category !== filterCategory) return false;
    if (filterKid && !(e.kid_name || "").toLowerCase().includes(filterKid.toLowerCase()))
      return false;
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-lg font-medium">Kids expenses</h1>
          <p className="text-sm text-gray-500">Education and aftercare</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Filtered total" value={total} />
        <StatCard label="All-time total" value={expenses.reduce((s, e) => s + Number(e.amount), 0)} />
        <StatCard label="Awaiting reimbursement" value={pendingReimbursement} />
      </div>

      <form onSubmit={handleAddExpense} className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium mb-3">Add expense</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="Education">Education</option>
            <option value="Aftercare">Aftercare</option>
          </select>
          <input
            type="text"
            placeholder="Kid's name"
            value={form.kid_name}
            onChange={(e) => setForm({ ...form, kid_name: e.target.value })}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          />
        </div>
        <input
          type="text"
          placeholder="Notes (e.g. tuition, camp, supplies)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm mb-3"
        />
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.reimbursement_requested}
              onChange={(e) => setForm({ ...form, reimbursement_requested: e.target.checked })}
            />
            Reimbursement requested
          </label>
          <label className="text-sm text-gray-600">
            Receipt:{" "}
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
          className="bg-gray-900 text-white rounded-md px-4 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add expense"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
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
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
        />
        <select
          value={filterReimbursed}
          onChange={(e) => setFilterReimbursed(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
        >
          <option value="">Reimbursement: any</option>
          <option value="yes">Requested</option>
          <option value="no">Not requested</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 p-6 text-center">No expenses match these filters.</p>
        )}
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center justify-between p-3 text-sm">
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-2 py-0.5 rounded-md ${
                  e.category === "Education" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
                }`}
              >
                {e.category}
              </span>
              <div>
                <div>
                  {e.kid_name || "Unspecified"}
                  {e.notes ? ` — ${e.notes}` : ""}
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-2">
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
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={e.reimbursement_requested}
                  onChange={() => toggleReimbursed(e)}
                />
                Reimbursed
              </label>
              <span className="font-medium">${Number(e.amount).toFixed(2)}</span>
              <button onClick={() => deleteExpense(e.id)} className="text-gray-400 hover:text-red-600">
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
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-medium">${Number(value).toFixed(2)}</div>
    </div>
  );
}
