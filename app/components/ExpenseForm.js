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
  reimbursement_granted: false,
};

export default function ExpenseForm({ session, expense, onSuccess, onCancel }) {
  const isEdit = !!expense;
  
  const [children, setChildren] = useState([]);
  const [form, setForm] = useState(
    isEdit 
      ? {
          created_at: new Date(expense.created_at).toISOString().slice(0, 10),
          amount: expense.amount,
          category: expense.category,
          child_id: expense.child_id || "",
          description: expense.description || "",
          reimbursement_requested: expense.reimbursement_requested || false,
          reimbursement_granted: expense.reimbursement_granted || false,
        }
      : emptyForm
  );

  const [receiptFile, setReceiptFile] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [proofFile, setProofFile] = useState(null);
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    if (!form.child_id) {
      alert("Please select a child before saving the expense.");
      return;
    }

    setSaving(true);

    try {
      const basePayload = {
        created_at: new Date(form.created_at).toISOString(),
        amount: Number(form.amount),
        category: form.category,
        description: form.description || null,
        reimbursement_requested: form.reimbursement_requested,
        reimbursement_granted: form.reimbursement_granted,
        child_id: form.child_id
      };

      let savedExpenseId;

      if (isEdit) {
        const { error: updateError } = await supabase
          .from("expense")
          .update(basePayload)
          .eq("id", expense.id);
        if (updateError) throw updateError;
        savedExpenseId = expense.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("expense")
          .insert(basePayload)
          .select()
          .single();
        if (insertError) throw insertError;
        savedExpenseId = inserted.id;
      }

      const filesToUpload = [
        { file: receiptFile, column: 'receipt_url' },
        { file: invoiceFile, column: 'invoice_url' },
        { file: proofFile, column: 'proof_of_payment_url' },
      ];

      for (const { file: f, column } of filesToUpload) {
        if (f && savedExpenseId) {
          const path = `${session.user.id}/${savedExpenseId}/${column}_${f.name}`;
          try {
            const { error: uploadError } = await supabase.storage.from("receipts").upload(path, f, {
              cacheControl: "3600",
              upsert: isEdit,
            });

            if (!uploadError) {
              await supabase.from("expense").update({ [column]: path }).eq("id", savedExpenseId);
            } else {
              console.error(`${column} upload failed`, uploadError);
              alert(`Expense saved, but ${column} upload failed: ` + uploadError.message);
            }
          } catch (uploadException) {
            console.error(`${column} upload threw`, uploadException);
            alert(`Expense saved, but ${column} upload failed unexpectedly.`);
          }
        }
      }

      if (!isEdit) {
        setForm({ ...emptyForm, created_at: new Date().toISOString().slice(0, 10) });
        setReceiptFile(null);
        setInvoiceFile(null);
        setProofFile(null);
      }
      
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to save expense", err);
      alert(err?.message || "Unexpected error while saving expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={isEdit ? "bg-surface p-4 border border-accent rounded-lg m-2" : "rounded-2xl border border-border bg-surface p-4 shadow-sm"}>
      {!isEdit && <p className="mb-3 text-sm font-semibold text-primary-strong">Add expense</p>}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <input
            type="date"
            value={form.created_at}
            onChange={(e) => setForm({ ...form, created_at: e.target.value })}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="education">Education</option>
            <option value="aftercare">Aftercare</option>
          </select>
          <select
            value={form.child_id}
            onChange={(e) => setForm({ ...form, child_id: e.target.value })}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
          className="mb-3 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={form.reimbursement_requested}
              onChange={(e) => setForm({ ...form, reimbursement_requested: e.target.checked })}
            />
            {isEdit ? "Req" : "Reimbursement Requested"}
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={form.reimbursement_granted}
              onChange={(e) => setForm({ ...form, reimbursement_granted: e.target.checked })}
            />
            {isEdit ? "Rcvd" : "Reimbursement Granted"}
          </label>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 mb-4">
          <label className="text-sm text-muted flex flex-col gap-1">
            <span className="font-medium">{isEdit ? "New Receipt (optional):" : "Receipt:"}</span>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files[0] || null)} className="text-xs" />
          </label>
          <label className="text-sm text-muted flex flex-col gap-1">
            <span className="font-medium">{isEdit ? "New Invoice (optional):" : "Invoice:"}</span>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setInvoiceFile(e.target.files[0] || null)} className="text-xs" />
          </label>
          <label className="text-sm text-muted flex flex-col gap-1">
            <span className="font-medium">{isEdit ? "New Proof (optional):" : "Proof of Payment:"}</span>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files[0] || null)} className="text-xs" />
          </label>
        </div>

        <div className={isEdit ? "flex justify-end gap-3 mt-4 border-t pt-4" : ""}>
          {isEdit && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="text-sm font-medium text-muted hover:text-text"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:opacity-50"
          >
            {saving ? "Saving..." : (isEdit ? "Save Changes" : "Add expense")}
          </button>
        </div>
      </form>
    </div>
  );
}