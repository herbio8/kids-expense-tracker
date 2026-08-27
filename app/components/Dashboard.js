"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import CreateExpense from "./CreateExpense";
import ExpenseList from "./ExpenseList";
import CreateChild from "./CreateChild";
import CreateExpenseReport from "./CreateExpenseReport";

export default function Dashboard({ session }) {
  const [currentView, setCurrentView] = useState("home");

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-primary-strong)]">
            Welcome, {session?.user?.email || "User"}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">Manage your kids expenses</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-strong)]"
        >
          Sign out
        </button>
      </div>

      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setCurrentView("home")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentView === "home"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary-strong)] hover:bg-[var(--color-accent-soft)]"
          }`}
        >
          Home
        </button>
        <button
          onClick={() => setCurrentView("createChild")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentView === "createChild"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary-strong)] hover:bg-[var(--color-accent-soft)]"
          }`}
        >
          Create Child
        </button>
        <button
          onClick={() => setCurrentView("create")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentView === "create"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary-strong)] hover:bg-[var(--color-accent-soft)]"
          }`}
        >
          Create Expense
        </button>
        <button
          onClick={() => setCurrentView("list")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentView === "list"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary-strong)] hover:bg-[var(--color-accent-soft)]"
          }`}
        >
          Show Expenses
        </button>
        <button
          onClick={() => setCurrentView("createReport")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentView === "createReport"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary-strong)] hover:bg-[var(--color-accent-soft)]"
          }`}
        >
          Create Expense Report
        </button>
      </div>

      {currentView === "home" && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--color-primary-strong)] mb-2">Dashboard Home</h2>
          <p className="text-[var(--color-muted)]">Select an option from the menu above to get started.</p>
        </div>
      )}
      
      {currentView === "createChild" && (
        <CreateChild
          session={session}
          onSuccess={() => setCurrentView("home")}
        />
      )}
      
      {currentView === "create" && (
        <CreateExpense
          session={session}
          onSuccess={() => setCurrentView("list")}
        />
      )}
      
      {currentView === "list" && (
        <ExpenseList session={session} />
      )}

      {currentView === "createReport" && (
        <CreateExpenseReport
          session={session}
          onSuccess={() => setCurrentView("list")}
        />
      )}
      
    </div>
  );
}
