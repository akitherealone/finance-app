"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // CHECK EXISTING SESSION
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        router.replace("/");
      }

      setCheckingSession(false);
    };

    checkSession();
  }, [router]);

  // LOGIN
  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.replace("/");
  }

  // SIGNUP
  async function handleSignup() {
    if (!email.trim() || !password.trim()) return;

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account created! You can now log in.");
  }

  if (checkingSession) {
    return <main style={{ padding: 30 }}>Checking session...</main>;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: 320,
          padding: 24,
          border: "1px solid #ddd",
          borderRadius: 10,
        }}
      >
        <h1>Finance Tracker</h1>

        <div style={{ marginTop: 20 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 10,
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 10,
            }}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 10,
            }}
          >
            {loading ? "Loading..." : "Login"}
          </button>

          <button
            onClick={handleSignup}
            disabled={loading}
            style={{
              width: "100%",
              padding: 10,
            }}
          >
            Sign Up
          </button>
        </div>
      </div>
    </main>
  );
}