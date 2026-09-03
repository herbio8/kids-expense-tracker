"use client";

import { useState } from "react";
import ExpenseList from "./ExpenseList";
import CreateExpense from "./CreateExpense";
import CreateExpenseReport from "./CreateExpenseReport";

export default function Expenses({ session }) {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border pb-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "list"
              ? "bg-primary text-white"
              : "text-primary-strong hover:bg-accent-soft"
          }`}
        >
          All Expenses
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "create"
              ? "bg-primary text-white"
              : "text-primary-strong hover:bg-accent-soft"
          }`}
        >
          New Expense
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "report"
              ? "bg-primary text-white"
              : "text-primary-strong hover:bg-accent-soft"
          }`}
        >
          Expense Reports
        </button>
      </div>

      <div>
        {activeTab === "list" && <ExpenseList session={session} />}
        {activeTab === "create" && (
          <CreateExpense 
            session={session} 
            onSuccess={() => setActiveTab("list")} 
          />
        )}
        {activeTab === "report" && (
          <CreateExpenseReport 
            session={session} 
            onSuccess={() => setActiveTab("list")} 
          />
        )}
      </div>
    </div>
  );
}