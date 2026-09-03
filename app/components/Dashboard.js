"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Profile from "./Profile";
import Home from "./Home";
import Expenses from "./Expenses";

export default function Dashboard({ session }) {
  const [currentView, setCurrentView] = useState("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      {/* Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20" 
          onClick={() => setIsMenuOpen(false)} 
        />
      )}

      {/* Navigation Drawer */}
      <div 
        className={`fixed top-0 left-0 h-full w-64 bg-surface shadow-2xl z-50 transform transition-transform duration-300 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-semibold text-primary-strong">Menu</h2>
          <button onClick={() => setIsMenuOpen(false)} className="text-muted hover:text-error font-bold p-1">
            ✕
          </button>
        </div>
        <div className="p-4 flex flex-col gap-2">
          {[
            { id: "home", label: "Home" },
            { id: "profile", label: "Profile" },
            { id: "expenses", label: "Expenses" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setIsMenuOpen(false);
              }}
              className={`text-left px-4 py-3 rounded-md text-sm font-semibold transition ${
                currentView === item.id
                  ? "bg-primary text-white"
                  : "bg-surface border border-border text-primary-strong hover:bg-accent-soft"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMenuOpen(true)} className="p-1 text-primary hover:text-primary-strong">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold text-primary-strong">
              Welcome, {session?.user?.email || "User"}
            </h1>
            <p className="text-sm text-muted">Manage your kids expenses</p>
          </div>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm font-medium text-primary hover:text-primary-strong"
        >
          Sign out
        </button>
      </div>

      {currentView === "home" && (
        <Home session={session} />
      )}
      
      {currentView === "profile" && (
        <Profile session={session} />
      )}
      
      {currentView === "expenses" && (
        <Expenses session={session} />
      )}
      
    </div>
  );
}
