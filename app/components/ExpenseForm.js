"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  created_at: new Date().toISOString().slice(0, 10),
  amount: "",
  category: "education",
  child_ids: [],
  description: "",
  status: "unsubmitted",
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
          child_ids: [expense.child_id].filter(Boolean),
          description: expense.description || "",
          status: expense.status || "unsubmitted",
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
    if (!form.child_ids || form.child_ids.length === 0) {
      alert("Please select at least one child before saving the expense.");
      return;
    }

    setSaving(true);

    try {
      const amountPerChild = (Number(form.amount) / form.child_ids.length).toFixed(2);

      let savedExpenseIds = [];

      if (isEdit) {
        const basePayload = {
          created_at: new Date(form.created_at).toISOString(),
          amount: Number(form.amount),
          category: form.category,
          description: form.description || null,
          status: form.status,
          child_id: form.child_ids[0]
        };

        const { error: updateError } = await supabase
          .from("expense")
          .update(basePayload)
          .eq("id", expense.id);
        if (updateError) throw updateError;
        savedExpenseIds = [expense.id];
      } else {
        const payloads = form.child_ids.map((child_id) => ({
          created_at: new Date(form.created_at).toISOString(),
          amount: Number(amountPerChild),
          category: form.category,
          description: form.description || null,
          status: form.status,
          child_id: child_id
        }));

        const { data: inserted, error: insertError } = await supabase
          .from("expense")
          .insert(payloads)
          .select();
        if (insertError) throw insertError;
        savedExpenseIds = inserted.map((i) => i.id);
      }

      const filesToUpload = [
        { file: receiptFile, column: 'receipt_url' },
        { file: invoiceFile, column: 'invoice_url' },
        { file: proofFile, column: 'proof_of_payment_url' },
      ];

      const mainExpenseId = savedExpenseIds[0];

      for (const { file: f, column } of filesToUpload) {
        if (f && mainExpenseId) {
          const path = `${session.user.id}/${mainExpenseId}/${column}_${f.name}`;
          try {
            const { error: uploadError } = await supabase.storage.from("receipts").upload(path, f, {
              cacheControl: "3600",
              upsert: isEdit,
            });

            if (!uploadError) {
              const { error: updateAllError } = await supabase
                .from("expense")
                .update({ [column]: path })
                .in("id", savedExpenseIds);
              
              if (updateAllError) {
                console.error(`Failed to link ${column} to all expenses`, updateAllError);
              }
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
          {isEdit ? (
            <select
              value={form.child_ids[0] || ""}
              onChange={(e) => setForm({ ...form, child_ids: [e.target.value] })}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Select child</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.first_name} {child.last_name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex flex-col justify-center px-1 gap-1">
              {children.length === 0 && <span className="text-xs text-muted">No children found</span>}
              {children.map((child) => (
                <label key={child.id} className="flex items-center gap-1.5 text-sm cursor-pointer text-text">
                  <input
                    type="checkbox"
                    checked={form.child_ids.includes(child.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, child_ids: [...form.child_ids, child.id] });
                      } else {
                        setForm({ ...form, child_ids: form.child_ids.filter((id) => id !== child.id) });
                      }
                    }}
                    className="accent-accent"
                  />
                  <span className="truncate">{child.first_name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <input
          type="text"
          placeholder="Notes (e.g. tuition, camp, supplies)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mb-3 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 mb-3">
          <label className="text-sm text-muted flex items-center gap-2">
            Status:
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="unsubmitted">Unsubmitted</option>
              <option value="requested">Requested</option>
              <option value="reimbursed">Reimbursed</option>
            </select>
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