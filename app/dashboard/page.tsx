"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Transaction = {
  id: number;
  title: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  created_at?: string;
  user_id?: string;
};

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [type, setType] = useState<"income" | "expense">("expense");

  const [customCategory, setCustomCategory] = useState("");
  const [categories, setCategories] = useState([
    "Food",
    "Transport",
    "School",
    "Savings",
    "Entertainment",
    "Other",
  ]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const COLORS = ["#FF4D4D", "#4DA6FF", "#4DFF88", "#FFB84D", "#B84DFF"];

  // =====================
  // AUTH
  // =====================
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      setLoadingAuth(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(session?.user ?? null);
      setLoadingAuth(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =====================
  // FETCH
  // =====================
  useEffect(() => {
    if (!user) return;
    fetchTransactions();
  }, [user]);

  async function fetchTransactions() {
    setLoadingData(true);

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setTransactions(data ?? []);
    setLoadingData(false);
  }

  // =====================
  // LOGOUT
  // =====================
  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // =====================
  // ADD / EDIT
  // =====================
  async function addTransaction() {
    if (!title.trim() || !amount.trim()) return;

    const amountNumber = Number(amount);
    if (Number.isNaN(amountNumber)) return;

    if (editingId !== null) {
      const { data } = await supabase
        .from("transactions")
        .update({
          title,
          amount: amountNumber,
          category,
          type,
        })
        .eq("id", editingId)
        .eq("user_id", user.id)
        .select();

      if (data?.[0]) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === editingId ? data[0] : t))
        );
      }

      setEditingId(null);
    } else {
      const { data } = await supabase
        .from("transactions")
        .insert([
          {
            title,
            amount: amountNumber,
            category,
            type,
            user_id: user.id,
          },
        ])
        .select();

      if (data?.[0]) {
        setTransactions((prev) => [data[0], ...prev]);
      }
    }

    setTitle("");
    setAmount("");
    setCategory("Food");
    setType("expense");
  }

  // =====================
  // DELETE
  // =====================
  async function deleteTransaction(id: number) {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  function editTransaction(t: Transaction) {
    setTitle(t.title);
    setAmount(t.amount.toString());
    setCategory(t.category);
    setType(t.type);
    setEditingId(t.id);
  }

  function addCategory() {
    if (!customCategory.trim()) return;
    setCategories((prev) => [...prev, customCategory]);
    setCustomCategory("");
  }

  // =====================
  // LOADING GUARD
  // =====================
  if (loadingAuth) return <main>Loading session...</main>;
  if (!user) return null;

  // =====================
  // CALCULATIONS
  // =====================
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expenses;

  const incomeData = Object.values(
    transactions.reduce((acc, t) => {
      if (t.type !== "income") return acc;

      if (!acc[t.category]) {
        acc[t.category] = { name: t.category, value: 0 };
      }

      acc[t.category].value += Number(t.amount);
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

  const expenseData = Object.values(
    transactions.reduce((acc, t) => {
      if (t.type !== "expense") return acc;

      if (!acc[t.category]) {
        acc[t.category] = { name: t.category, value: 0 };
      }

      acc[t.category].value += Number(t.amount);
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

  // =====================
  // UI
  // =====================
  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "Arial" }}>

      {/* HEADER */}
      <div style={{ padding: 20, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ddd" }}>
        <h1>Finance Tracker</h1>

        <div style={{ display: "flex", gap: 10 }}>
          <p>{user.email}</p>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT SIDE (OVERVIEW + TRANSACTIONS) */}
        <div style={{ flex: 2, padding: 20, overflowY: "auto" }}>

          {/* OVERVIEW (moved here as requested) */}
          <div style={{ marginBottom: 20 }}>
            <h2>Overview</h2>
            <p>💰 Balance: ₱{balance}</p>
            <p style={{ color: "green" }}>📈 Income: ₱{income}</p>
            <p style={{ color: "red" }}>📉 Expenses: ₱{expenses}</p>
          </div>

          {/* ADD SECTION (floating above history) */}
          <div style={{ padding: 15, border: "1px solid #ddd", borderRadius: 10, marginBottom: 20 }}>
            <h3>Add Data</h3>

            <input
              placeholder="New category"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
            />
            <button onClick={addCategory}>Add</button>

            <div style={{ marginTop: 10 }}>
              <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />

              <select value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <button onClick={addTransaction}>
                {editingId ? "Save Edit" : "Add"}
              </button>
            </div>
          </div>

          {/* TRANSACTION HISTORY (independent scroll) */}
          <div>
            <h3>Transaction History</h3>

            {loadingData && <p>Loading...</p>}

            {transactions.map((t) => (
              <div key={t.id} style={{ marginBottom: 10 }}>
                <strong>{t.title}</strong>
                <p style={{ color: t.type === "income" ? "green" : "red" }}>
                  ₱{t.amount} ({t.category})
                </p>

                <button onClick={() => editTransaction(t)}>Edit</button>
                <button onClick={() => deleteTransaction(t.id)} style={{ color: "red" }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE (ANALYTICS FIXED) */}
        <div style={{ flex: 1, borderLeft: "1px solid #ddd", padding: 20 }}>

          <h3>Income</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={incomeData} dataKey="value" nameKey="name" label>
                {incomeData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <h3 style={{ marginTop: 20 }}>Expenses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={expenseData} dataKey="value" nameKey="name" label>
                {expenseData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

        </div>
      </div>
    </main>
  );
}