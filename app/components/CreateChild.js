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
    
    // Generate a unique ID for the child client-side to avoid RLS selection issues
    const childId = crypto.randomUUID();

    // 0. Ensure the parent record exists to prevent Foreign Key violations
    await supabase
      .from("parent")
      .upsert({
        id: session.user.id,
        first_name: session.user.user_metadata?.first_name || session.user.email?.split("@")[0] || "Parent",
        last_name: session.user.user_metadata?.last_name || "Name"
      });

    // 1. Insert into child table without .select()
    const { error: childError } = await supabase
      .from("child")
      .insert({
        id: childId,
        first_name: firstName.trim(),
        last_name: lastName.trim()
      });

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
        child_id: childId
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
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-primary-strong">Add Child</h2>
      <form onSubmit={handleAddChild} className="flex flex-col gap-4 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-muted mb-1">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted mb-1">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Child"}
        </button>
      </form>
    </div>
  );
}