"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Profile({ session }) {
  const [parentInfo, setParentInfo] = useState({ first_name: "", last_name: "" });
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States for adding a new child
  const [newChildFirstName, setNewChildFirstName] = useState("");
  const [newChildLastName, setNewChildLastName] = useState("");
  const [addingChild, setAddingChild] = useState(false);

  // States for editing parent/child
  const [savingParent, setSavingParent] = useState(false);
  const [editingChildId, setEditingChildId] = useState(null);
  const [editChildForm, setEditChildForm] = useState({ first_name: "", last_name: "" });
  const [savingChild, setSavingChild] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      loadProfileData();
    }
  }, [session]);

  async function loadProfileData() {
    setLoading(true);
    
    // 1. Fetch parent info
    const { data: parentData, error: parentError } = await supabase
      .from("parent")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (parentData) {
      setParentInfo({
        first_name: parentData.first_name,
        last_name: parentData.last_name,
      });
    } else {
      setParentInfo({
        first_name: session.user.user_metadata?.first_name || session.user.email?.split("@")[0] || "Parent",
        last_name: session.user.user_metadata?.last_name || "Name",
      });
    }

    // 2. Fetch children via parent_child link
    const { data: childrenData, error: childrenError } = await supabase
      .from("child")
      .select("id, first_name, last_name")
      .order("first_name", { ascending: true });

    if (!childrenError && childrenData) {
      setChildren(childrenData);
    }
    
    setLoading(false);
  }

  async function handleUpdateParent(e) {
    e.preventDefault();
    setSavingParent(true);
    const { error } = await supabase
      .from("parent")
      .upsert({
        id: session.user.id,
        first_name: parentInfo.first_name,
        last_name: parentInfo.last_name
      });
      
    setSavingParent(false);
    if (error) {
      alert("Failed to update profile: " + error.message);
    } else {
      alert("Profile updated successfully!");
    }
  }

  async function handleAddChild(e) {
    e.preventDefault();
    if (!newChildFirstName || !newChildLastName) return;
    setAddingChild(true);

    const childId = crypto.randomUUID();

    // Ensure parent exists first
    await supabase.from("parent").upsert({
      id: session.user.id,
      first_name: parentInfo.first_name,
      last_name: parentInfo.last_name
    });

    const { error: childError } = await supabase
      .from("child")
      .insert({
        id: childId,
        first_name: newChildFirstName.trim(),
        last_name: newChildLastName.trim()
      });

    if (childError) {
      alert("Error adding child: " + childError.message);
      setAddingChild(false);
      return;
    }

    const { error: linkError } = await supabase
      .from("parent_child")
      .insert({
        parent_id: session.user.id,
        child_id: childId
      });

    setAddingChild(false);

    if (linkError) {
      alert("Child created but linking to parent failed: " + linkError.message);
    } else {
      setNewChildFirstName("");
      setNewChildLastName("");
      loadProfileData();
    }
  }

  function startEditingChild(child) {
    setEditingChildId(child.id);
    setEditChildForm({ first_name: child.first_name, last_name: child.last_name });
  }

  async function handleUpdateChild(e, id) {
    e.preventDefault();
    if (!editChildForm.first_name || !editChildForm.last_name) return;
    setSavingChild(true);
    
    const { error } = await supabase
      .from("child")
      .update({
        first_name: editChildForm.first_name.trim(),
        last_name: editChildForm.last_name.trim()
      })
      .eq("id", id);
      
    setSavingChild(false);
    if (error) {
      alert("Error updating child: " + error.message);
    } else {
      setEditingChildId(null);
      loadProfileData();
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      {/* User Info Section */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-primary-strong flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          Your Profile
        </h2>
        <div className="mb-4 text-sm text-muted">
          <span className="font-medium">Email:</span> {session.user.email}
        </div>
        <form onSubmit={handleUpdateParent} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-muted mb-1">First Name</label>
            <input
              type="text"
              value={parentInfo.first_name}
              onChange={(e) => setParentInfo({ ...parentInfo, first_name: e.target.value })}
              className="w-full sm:w-64 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-muted mb-1">Last Name</label>
            <input
              type="text"
              value={parentInfo.last_name}
              onChange={(e) => setParentInfo({ ...parentInfo, last_name: e.target.value })}
              className="w-full sm:w-64 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={savingParent}
            className="w-full sm:w-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:opacity-50"
          >
            {savingParent ? "Saving..." : "Update Info"}
          </button>
        </form>
      </div>

      {/* Children Section */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-primary-strong flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          Your Children
        </h2>
        
        {children.length > 0 ? (
          <div className="divide-y divide-border mb-6 border border-border rounded-lg overflow-hidden">
            {children.map((child) => (
              <div key={child.id} className="p-3 bg-surface hover:bg-accent-soft transition flex items-center justify-between">
                {editingChildId === child.id ? (
                  <form onSubmit={(e) => handleUpdateChild(e, child.id)} className="flex items-center gap-3 w-full">
                    <input
                      type="text"
                      value={editChildForm.first_name}
                      onChange={(e) => setEditChildForm({ ...editChildForm, first_name: e.target.value })}
                      className="rounded-md border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent w-full max-w-xs"
                      required
                    />
                    <input
                      type="text"
                      value={editChildForm.last_name}
                      onChange={(e) => setEditChildForm({ ...editChildForm, last_name: e.target.value })}
                      className="rounded-md border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent w-full max-w-xs"
                      required
                    />
                    <div className="flex gap-2 ml-auto">
                      <button type="submit" disabled={savingChild} className="text-sm font-semibold text-primary hover:text-primary-strong">Save</button>
                      <button type="button" onClick={() => setEditingChildId(null)} className="text-sm font-semibold text-muted hover:text-error">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="font-medium text-text">
                      {child.first_name} {child.last_name}
                    </div>
                    <button onClick={() => startEditingChild(child)} className="text-sm font-semibold text-primary hover:text-primary-strong">
                      Edit
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted mb-6 italic">You haven't added any children yet.</p>
        )}

        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-semibold text-primary-strong mb-3">Add a Child</h3>
          <form onSubmit={handleAddChild} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-muted mb-1">First Name</label>
              <input
                type="text"
                value={newChildFirstName}
                onChange={(e) => setNewChildFirstName(e.target.value)}
                className="w-full sm:w-48 rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-muted mb-1">Last Name</label>
              <input
                type="text"
                value={newChildLastName}
                onChange={(e) => setNewChildLastName(e.target.value)}
                className="w-full sm:w-48 rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={addingChild}
              className="w-full sm:w-auto rounded-md bg-accent-soft px-4 py-1.5 text-sm font-semibold text-primary-strong transition hover:bg-border disabled:opacity-50 border border-border"
            >
              {addingChild ? "Adding..." : "Add Child"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}