"use client";

import ExpenseForm from "./ExpenseForm";

export default function EditExpense({ expense, session, onSave, onCancel }) {
  return (
    <ExpenseForm 
      session={session} 
      expense={expense} 
      onSuccess={onSave} 
      onCancel={onCancel} 
    />
  );
}