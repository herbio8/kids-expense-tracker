"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

export default function Home() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="p-8 text-sm text-gray-500">Loading...</div>;
  }

  return session ? <Dashboard session={session} /> : <Login />;
}
