"use client";

import ExpenseForm from "./ExpenseForm";

export default function CreateExpense({ session, onSuccess }) {
  return <ExpenseForm session={session} onSuccess={onSuccess} />;
}
