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
  const [fullscreen, setFullscreen] = useState(false);

  const COLORS = ["#FF4D4D", "#4DA6FF", "#4DFF88", "#FFB84D", "#B84DFF"];

// =====================
// AUTH (FINAL FIX)
// =====================
useEffect(() => {
  let mounted = true;

  const initAuth = async () => {
    setLoadingAuth(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!mounted) return;

    if (session?.user) {
      setUser(session.user);
    } else {
      setUser(null);
    }

    setLoadingAuth(false);
  };

  initAuth();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!mounted) return;

    if (session?.user) {
      setUser(session.user);
    } else {
      setUser(null);
    }
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

  // =====================
  // FETCH TRANSACTIONS
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
  // LOADING GUARD (IMPORTANT)
  // =====================
  if (loadingAuth) return <main>Loading session...</main>;
  console.log("AUTH USER:", user);
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

  const balance = income + expenses;

  const categoryData = Object.values(
    transactions.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = { name: t.category, value: 0 };
      }

      if (t.type === "expense") {
        acc[t.category].value += t.amount;
      }

      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

  // =====================
  // UI
  // =====================
  return (
    <main style={{ padding: 30, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Finance Tracker</h1>

        <div style={{ display: "flex", gap: 10 }}>
          <p>{user.email}</p>
          <button onClick={logout}>Logout</button>
          <button onClick={() => setFullscreen((p) => !p)}>
            {fullscreen ? "Exit Focus" : "Focus Mode"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: 15, border: "1px solid #ddd" }}>
        <h2>Overview</h2>
        <p>💰 Balance: ₱{balance}</p>
        <p style={{ color: "green" }}>📈 Income: ₱{income}</p>
        <p style={{ color: "red" }}>📉 Expenses: ₱{expenses}</p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 20,
          flexDirection: fullscreen ? "column" : "row",
        }}
      >
        <div style={{ flex: fullscreen ? 1 : 2 }}>
          <div>
            <input
              placeholder="New category"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
            />
            <button onClick={addCategory}>Add</button>
          </div>

          <div style={{ marginTop: 10 }}>
            <input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

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

          <div style={{ marginTop: 20 }}>
            {loadingData && <p>Loading transactions...</p>}

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

        {!fullscreen && (
          <div style={{ flex: 1, borderLeft: "1px solid #ddd", paddingLeft: 20 }}>
            <h2>Analytics</h2>

            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={120}
                    label
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}