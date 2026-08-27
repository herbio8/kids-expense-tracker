"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  created_at: new Date().toISOString().slice(0, 10),
  amount: "",
  category: "education",
  child_id: "",
  description: "",
  reimbursement_requested: false,
};

function isMissingColumnError(error) {
  return Boolean(
    error?.message && /could not find the '.*' column|schema cache/i.test(error.message)
  );
}

export default function CreateExpense({ session, onSuccess }) {
  const [children, setChildren] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  async function loadChildren() {
    const { data, error } = await supabase
      .from("child")
      .select("id, first_name, last_name")
      .order("first_name", { ascending: true });

    if (!error) setChildren(data || []);
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    if (!form.child_id) {
      alert("Please select a child before saving the expense.");
      return;
    }

    setSaving(true);

    try {
      // Keep timezone format by creating a full date string if possible, or passing YYYY-MM-DD which postgres parses to TIMESTAMPTZ
      const basePayload = {
        created_at: new Date(form.created_at).toISOString(),
        amount: Number(form.amount),
        category: form.category,
        description: form.description || null,
        reimbursement_requested: form.reimbursement_requested,
        child_id: form.child_id
      };

      const { data: inserted, error: insertError } = await supabase
        .from("expense")
        .insert(basePayload)
        .select()
        .single();

      let savedExpense = inserted;

      if (insertError) {
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
            await supabase.from("expense").update({ receipt_url: path }).eq("id", savedExpense.id);
          } else {
            console.error("Receipt upload failed", uploadError);
            alert("Expense was saved, but the receipt could not be uploaded: " + uploadError.message);
          }
        } catch (uploadException) {
          console.error("Receipt upload threw", uploadException);
          alert("Expense was saved, but the receipt upload failed unexpectedly.");
        }
      }

      setForm({ ...emptyForm, created_at: new Date().toISOString().slice(0, 10) });
      setFile(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to save expense", err);
      alert(err?.message || "Unexpected error while saving expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-[var(--color-primary-strong)]">Add expense</p>
      <form onSubmit={handleAddExpense}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <input
            type="date"
            value={form.created_at}
            onChange={(e) => setForm({ ...form, created_at: e.target.value })}
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
            <option value="education">Education</option>
            <option value="aftercare">Aftercare</option>
          </select>
          <select
            value={form.child_id}
            onChange={(e) => setForm({ ...form, child_id: e.target.value })}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="">Select child</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.first_name} {child.last_name}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          placeholder="Notes (e.g. tuition, camp, supplies)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
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
  );
}
