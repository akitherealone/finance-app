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

  // ================= CHART CUSTOMIZATION =================
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(
    {}
  );

  const COLORS = ["#FF4D4D", "#4DA6FF", "#4DFF88", "#FFB84D", "#B84DFF"];

  function getColor(category: string, index: number) {
    return categoryColors[category] || COLORS[index % COLORS.length];
  }

  function setCategoryColor(cat: string, color: string) {
    setCategoryColors((prev) => ({
      ...prev,
      [cat]: color,
    }));
  }

  // ================= AUTH =================
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(data.session?.user ?? null);
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

  // ================= FETCH =================
  useEffect(() => {
    if (!user) return;

    async function fetchTransactions() {
      setLoadingData(true);

      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id);

      setTransactions(data ?? []);
      setLoadingData(false);
    }

    fetchTransactions();
  }, [user]);

  // ================= LOGOUT =================
  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // ================= ADD =================
  async function addTransaction() {
    if (!title.trim() || !amount.trim()) return;

    const amountNumber = Number(amount);

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

    setTitle("");
    setAmount("");
  }

  // ================= DELETE =================
  async function deleteTransaction(id: number) {
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((p) => p.filter((t) => t.id !== id));
  }

  // ================= LOADING =================
  if (loadingAuth) return <main>Loading session...</main>;
  if (!user) return null;

  // ================= CALCULATIONS =================
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const balance = income - expenses;

  const expenseData = Object.values(
    transactions.reduce((acc, t) => {
      if (t.type !== "expense") return acc;

      if (!acc[t.category]) {
        acc[t.category] = { name: t.category, value: 0 };
      }

      acc[t.category].value += t.amount;
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

  const renderLabel = (entry: any) => entry.name;

  // ================= UI =================
  return (
    <main style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

      {/* HEADER (UNCHANGED STRUCTURE) */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        padding: 20,
        borderBottom: "1px solid #ddd",
      }}>
        <h2>Finance Tracker</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <span>{user.email}</span>
          <button onClick={logout}>Logout</button>
          <button onClick={() => setFullscreen(p => !p)}>
            {fullscreen ? "Exit Focus" : "Focus Mode"}
          </button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT - FLOATING OVERVIEW + CHART */}
        <div style={{
          width: 420,
          borderRight: "1px solid #ddd",
          padding: 20,
          overflow: "hidden"
        }}>

          {/* OVERVIEW (UNCHANGED) */}
          <div style={{ marginBottom: 20 }}>
            <h3>Overview</h3>
            <p>Balance: ₱{balance}</p>
            <p style={{ color: "green" }}>Income: ₱{income}</p>
            <p style={{ color: "red" }}>Expenses: ₱{expenses}</p>
          </div>

          {/* CHART HEADER */}
          <div style={{ position: "relative" }}>
            <h3>Expenses</h3>

            {/* 3 DOT MENU */}
            <div
              style={{ position: "absolute", right: 0, top: 0, cursor: "pointer" }}
              onClick={() => setMenuOpen(p => !p)}
            >
              ⋮
            </div>

            {menuOpen && (
              <div style={{
                position: "absolute",
                right: 0,
                top: 25,
                background: "white",
                border: "1px solid #ddd",
                padding: 10,
                zIndex: 10
              }}>
                <button onClick={() => setColorPickerOpen(true)}>
                  Customize Colors
                </button>
              </div>
            )}
          </div>

          {/* COLOR PICKER */}
          {colorPickerOpen && (
            <div style={{
              position: "fixed",
              top: "30%",
              left: "40%",
              background: "white",
              padding: 20,
              border: "1px solid #ccc",
              zIndex: 20
            }}>
              <h4>Category Colors</h4>

              {expenseData.map((d, i) => (
                <div key={d.name} style={{ marginBottom: 10 }}>
                  <span>{d.name}</span>
                  <input
                    type="color"
                    value={categoryColors[d.name] || COLORS[i % COLORS.length]}
                    onChange={(e) => setCategoryColor(d.name, e.target.value)}
                  />
                </div>
              ))}

              <button onClick={() => setColorPickerOpen(false)}>Close</button>
            </div>
          )}

          {/* PIE CHART */}
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={expenseData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label={renderLabel} // CATEGORY ONLY
                >
                  {expenseData.map((e, i) => (
                    <Cell
                      key={e.name}
                      fill={getColor(e.name, i)}
                    />
                  ))}
                </Pie>

                {/* ONLY AMOUNT ON HOVER */}
                <Tooltip formatter={(v: any) => [`₱${v}`, "Amount"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* RIGHT - TRANSACTIONS (UNCHANGED STRUCTURE) */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>

          <h3>Add Transaction</h3>

          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
          <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />

          <select value={type} onChange={e => setType(e.target.value as any)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>

          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option>Food</option>
            <option>Transport</option>
            <option>School</option>
            <option>Savings</option>
            <option>Entertainment</option>
            <option>Other</option>
          </select>

          <button onClick={addTransaction}>Add</button>

          <hr style={{ margin: "20px 0" }} />

          <h3>History</h3>

          {transactions.map(t => (
            <div key={t.id}>
              <b>{t.title}</b>
              <p>₱{t.amount} ({t.category})</p>
              <button onClick={() => deleteTransaction(t.id)}>Delete</button>
            </div>
          ))}

        </div>
      </div>
    </main>
  );
}