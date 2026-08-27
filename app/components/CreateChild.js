"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CreateChild({ session, onSuccess }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAddChild(e) {
    e.preventDefault();
    if (!firstName || !lastName) return;

    setSaving(true);
    
    // 1. Insert into child table
    const { data: childData, error: childError } = await supabase
      .from("child")
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim()
      })
      .select("id")
      .single();

    if (childError) {
      setSaving(false);
      alert(childError.message);
      return;
    }

    // 2. Insert into parent_child table to link them
    const { error: linkError } = await supabase
      .from("parent_child")
      .insert({
        parent_id: session.user.id,
        child_id: childData.id
      });

    setSaving(false);

    if (linkError) {
      alert("Child created but linking to parent failed: " + linkError.message);
      return;
    }

    setFirstName("");
    setLastName("");
    if (onSuccess) onSuccess();
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--color-primary-strong)]">Add Child</h2>
      <form onSubmit={handleAddChild} className="flex flex-col gap-4 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-[var(--color-muted)] mb-1">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-muted)] mb-1">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Child"}
        </button>
      </form>
    </div>
  );
}