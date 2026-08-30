"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Home({ session }) {
  const [loading, setLoading] = useState(true);
  const [missingDocs, setMissingDocs] = useState([]);
  const [readyForReport, setReadyForReport] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch expenses with their child details and report links
      const { data: expensesData, error: expensesError } = await supabase
        .from("expense")
        .select(`
          *,
          child:child_id ( first_name, last_name ),
          expense_to_expense_report ( report_id )
        `)
        .order("created_at", { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch pending reports (assuming 'draft' or 'submitted')
      const { data: reportsData, error: reportsError } = await supabase
        .from("expense_report")
        .select("*")
        .in("status", ["draft", "submitted"])
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      const missing = [];
      const ready = [];

      if (expensesData) {
        expensesData.forEach((expense) => {
          const hasAllDocs =
            expense.invoice_url &&
            expense.receipt_url &&
            expense.proof_of_payment_url;
            
          const inReport =
            expense.expense_to_expense_report &&
            expense.expense_to_expense_report.length > 0;

          if (!hasAllDocs) {
            missing.push(expense);
          } else if (!inReport) {
            ready.push(expense);
          }
        });
      }

      setMissingDocs(missing);
      setReadyForReport(ready);
      setPendingReports(reportsData || []);
    } catch (err) {
      console.error("Error fetching home data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="text-error bg-error-bg-strong p-4 rounded-md">
        Error loading data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Missing Documents Section */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-error-strong mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Missing Documents ({missingDocs.length})
          </h2>
          {missingDocs.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {missingDocs.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 border border-error-border bg-error-bg rounded-lg text-sm"
                >
                  <div className="font-medium text-text">
                    {exp.description || "Untitled Expense"}
                  </div>
                  <div className="text-muted text-xs mt-1">
                    Child: {exp.child?.first_name} {exp.child?.last_name} | Amount: $
                    {exp.amount}
                  </div>
                  <div className="text-error text-xs mt-2 font-medium">
                    Missing:{" "}
                    {[
                      !exp.invoice_url && "Invoice",
                      !exp.receipt_url && "Receipt",
                      !exp.proof_of_payment_url && "Proof of Payment",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted italic">
              All expenses have their required documents!
            </p>
          )}
        </div>

        {/* Ready for Report Section */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-success-strong mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Ready for Report ({readyForReport.length})
          </h2>
          {readyForReport.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {readyForReport.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 border border-success-border bg-success-bg rounded-lg text-sm"
                >
                  <div className="font-medium text-text">
                    {exp.description || "Untitled Expense"}
                  </div>
                  <div className="text-muted text-xs mt-1">
                    Child: {exp.child?.first_name} {exp.child?.last_name} | Amount: $
                    {exp.amount}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted italic">
              No expenses are currently waiting to be added to a report.
            </p>
          )}
        </div>
      </div>

      {/* Pending Reports Section */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-info-strong mb-4 flex items-center">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Pending Reports ({pendingReports.length})
        </h2>
        {pendingReports.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pendingReports.map((report) => (
              <div
                key={report.id}
                className="p-4 border border-info-border bg-info-bg rounded-lg"
              >
                <div className="font-semibold text-text">{report.name}</div>
                <div className="mt-2 flex justify-between items-center text-xs">
                  <span className="text-muted">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-1 bg-info-bg-strong text-info-text rounded-full font-medium capitalize">
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted italic">
            You don't have any pending reports.
          </p>
        )}
      </div>
    </div>
  );
}
