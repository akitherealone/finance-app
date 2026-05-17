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

  // =====================
  // 🎨 CHART CUSTOMIZATION STATE
  // =====================
  const [incomeColors, setIncomeColors] = useState([
    "#4DA6FF",
    "#4DFF88",
    "#FFB84D",
    "#B84DFF",
  ]);

  const [expenseColors, setExpenseColors] = useState([
    "#FF4D4D",
    "#FF884D",
    "#FF4DB8",
    "#FFB84D",
  ]);

  const [activeMenu, setActiveMenu] = useState<null | "income" | "expense">(null);
  const [colorPicker, setColorPicker] = useState<{
    type: "income" | "expense";
    index: number;
  } | null>(null);

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

  async function deleteTransaction(id: number) {
    await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  function editTransaction(t: Transaction) {
    setTitle(t.title);
    setAmount(t.amount.toString());
    setCategory(t.category);
    setType(t.type);
    setEditingId(t.id);
  }

  // =====================
  // DATA SPLIT
  // =====================
  const incomeData = Object.values(
    transactions.reduce((acc, t) => {
      if (t.type !== "income") return acc;
      if (!acc[t.category]) acc[t.category] = { name: t.category, value: 0 };
      acc[t.category].value += Number(t.amount);
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

  const expenseData = Object.values(
    transactions.reduce((acc, t) => {
      if (t.type !== "expense") return acc;
      if (!acc[t.category]) acc[t.category] = { name: t.category, value: 0 };
      acc[t.category].value += Number(t.amount);
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

  // =====================
  // COLORS UPDATE HELPERS
  // =====================
  function updateColor(
    type: "income" | "expense",
    index: number,
    color: string
  ) {
    if (type === "income") {
      setIncomeColors((prev) => prev.map((c, i) => (i === index ? color : c)));
    } else {
      setExpenseColors((prev) => prev.map((c, i) => (i === index ? color : c)));
    }
  }

  // =====================
  // GUARD
  // =====================
  if (loadingAuth) return <main>Loading session...</main>;
  if (!user) return null;

  const income = transactions.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  const balance = income - expenses;

  return (
    <main style={{ padding: 30, fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Finance Tracker</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <p>{user.email}</p>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {/* ===================== */}
      {/* OVERVIEW */}
      {/* ===================== */}
      <div style={{ marginTop: 20 }}>
        <p>Balance: ₱{balance}</p>
        <p>Income: ₱{income}</p>
        <p>Expenses: ₱{expenses}</p>
      </div>

      {/* ===================== */}
      {/* CHARTS */}
      {/* ===================== */}
      <div style={{ display: "flex", gap: 40, marginTop: 30 }}>

        {/* INCOME */}
        <div
          style={{ width: "50%", position: "relative" }}
          onMouseEnter={() => setActiveMenu("income")}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <h3>Income</h3>

          {activeMenu === "income" && (
            <div style={{ position: "absolute", right: 0, top: 0 }}>
              <button onClick={() => setColorPicker({ type: "income", index: 0 })}>
                ⋮
              </button>
            </div>
          )}

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={incomeData} dataKey="value" nameKey="name" label>
                {incomeData.map((_, i) => (
                  <Cell key={i} fill={incomeColors[i % incomeColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* EXPENSE */}
        <div
          style={{ width: "50%", position: "relative" }}
          onMouseEnter={() => setActiveMenu("expense")}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <h3>Expenses</h3>

          {activeMenu === "expense" && (
            <div style={{ position: "absolute", right: 0, top: 0 }}>
              <button onClick={() => setColorPicker({ type: "expense", index: 0 })}>
                ⋮
              </button>
            </div>
          )}

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={expenseData} dataKey="value" nameKey="name" label>
                {expenseData.map((_, i) => (
                  <Cell key={i} fill={expenseColors[i % expenseColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===================== */}
      {/* COLOR PICKER POPUP */}
      {/* ===================== */}
      {colorPicker && (
        <div
          style={{
            position: "fixed",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: 20,
            border: "1px solid #ccc",
          }}
        >
          <h3>Pick Color</h3>

          <input
            type="color"
            onChange={(e) =>
              updateColor(colorPicker.type, colorPicker.index, e.target.value)
            }
          />

          <button onClick={() => setColorPicker(null)}>Close</button>
        </div>
      )}
    </main>
  );
}