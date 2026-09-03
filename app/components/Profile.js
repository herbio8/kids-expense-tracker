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
  const [visibleCodes, setVisibleCodes] = useState({});
  const [expandedChildren, setExpandedChildren] = useState({});
  const [isAddChildExpanded, setIsAddChildExpanded] = useState(false);

  // States for linking existing child
  const [linkChildCode, setLinkChildCode] = useState("");
  const [linkingChild, setLinkingChild] = useState(false);

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

  async function handleRemoveChild(childId) {
    if (!confirm("Are you sure you want to remove this child from your profile? This will only remove your access to them.")) return;
    
    const { error } = await supabase
      .from("parent_child")
      .delete()
      .match({ parent_id: session.user.id, child_id: childId });
    
    if (error) {
      alert("Error removing child: " + error.message);
    } else {
      loadProfileData();
    }
  }

  async function handleLinkChild(e) {
    e.preventDefault();
    if (!linkChildCode) return;
    setLinkingChild(true);

    // Ensure parent exists first
    await supabase.from("parent").upsert({
      id: session.user.id,
      first_name: parentInfo.first_name,
      last_name: parentInfo.last_name
    });

    const { error: linkError } = await supabase
      .from("parent_child")
      .insert({
        parent_id: session.user.id,
        child_id: linkChildCode.trim()
      });
    
    setLinkingChild(false);

    if (linkError) {
      alert("Failed to link child. Check if the code is correct. " + linkError.message);
    } else {
      setLinkChildCode("");
      loadProfileData();
    }
  }

  function toggleCodeVisibility(id) {
    setVisibleCodes(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleChildDrawer(id) {
    setExpandedChildren(prev => ({ ...prev, [id]: !prev[id] }));
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
              <div key={child.id} className="p-3 bg-surface hover:bg-accent-soft transition flex flex-col gap-2">
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
                    <div 
                      className="flex items-center justify-between w-full cursor-pointer" 
                      onClick={() => toggleChildDrawer(child.id)}
                    >
                      <div className="font-medium text-text">
                        {child.first_name} {child.last_name}
                      </div>
                      <button className="text-muted hover:text-primary transition p-1 rounded-full hover:bg-surface">
                        {expandedChildren[child.id] ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        )}
                      </button>
                    </div>
                    {expandedChildren[child.id] && (
                      <div className="pt-3 mt-1 border-t border-border flex flex-col gap-3">
                        <div className="flex gap-4">
                          <button onClick={() => startEditingChild(child)} className="text-sm font-semibold text-primary hover:text-primary-strong flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Edit Child
                          </button>
                          <button onClick={() => handleRemoveChild(child.id)} className="text-sm font-semibold text-muted hover:text-error flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Remove Child
                          </button>
                        </div>
                        <div className="text-xs text-muted flex items-center gap-2">
                          <span className="font-medium">Link Code:</span>
                          {visibleCodes[child.id] ? (
                            <code className="bg-bg px-2 py-0.5 rounded border border-border select-all">{child.id}</code>
                          ) : (
                            <span className="bg-bg px-2 py-0.5 rounded border border-border text-transparent select-none">••••••••••••••••••••••••••••••••••••</span>
                          )}
                          <button 
                            onClick={() => toggleCodeVisibility(child.id)}
                            className="text-primary hover:text-primary-strong font-medium underline"
                          >
                            {visibleCodes[child.id] ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted mb-6 italic">You haven't added any children yet.</p>
        )}

        <div className="pt-2 border-t border-border">
          <div 
            className="flex items-center justify-between cursor-pointer py-2 hover:bg-accent-soft px-2 -mx-2 rounded-md transition"
            onClick={() => setIsAddChildExpanded(!isAddChildExpanded)}
          >
            <h3 className="text-sm font-semibold text-primary-strong">Add a Child to Your Profile</h3>
            <button className="text-muted hover:text-primary transition p-1 rounded-full hover:bg-surface">
              {isAddChildExpanded ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              )}
            </button>
          </div>

          {isAddChildExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-border">
              <div>
                <h3 className="text-sm font-semibold text-primary-strong mb-3">Create New Child</h3>
                <form onSubmit={handleAddChild} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-medium text-muted">First Name</label>
                    <input
                      type="text"
                      value={newChildFirstName}
                      onChange={(e) => setNewChildFirstName(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-medium text-muted">Last Name</label>
                    <input
                      type="text"
                      value={newChildLastName}
                      onChange={(e) => setNewChildLastName(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addingChild}
                    className="w-full rounded-md bg-accent-soft px-4 py-1.5 text-sm font-semibold text-primary-strong transition hover:bg-border disabled:opacity-50 border border-border"
                  >
                    {addingChild ? "Creating..." : "Create Child"}
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary-strong mb-1">Link Existing Child</h3>
                <p className="text-xs text-muted mb-3">Ask the other parent for their child's Link Code and paste it below.</p>
                <form onSubmit={handleLinkChild} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs font-medium text-muted">Link Code</label>
                    <input
                      type="text"
                      value={linkChildCode}
                      onChange={(e) => setLinkChildCode(e.target.value)}
                      placeholder="e.g. 123e4567-e89b-..."
                      className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={linkingChild}
                    className="w-full rounded-md bg-accent-soft px-4 py-1.5 text-sm font-semibold text-primary-strong transition hover:bg-border disabled:opacity-50 border border-border mt-auto"
                  >
                    {linkingChild ? "Linking..." : "Link Child"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}