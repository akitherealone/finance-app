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

  const COLORS = [
    "#FF4D4D",
    "#4DA6FF",
    "#4DFF88",
    "#FFB84D",
    "#B84DFF",
    "#FF66B2",
    "#00C2A8",
    "#FFD93D",
    "#6C63FF",
    "#FF8C42",
  ];

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

    if (categories.includes(customCategory)) return;

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

      acc[t.category].value += t.amount;
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

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

  // =====================
  // LABELS
  // =====================
  const renderCustomizedLabel = ({
    name,
    percent,
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
  }: any) => {
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.2;

    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#333"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
      >
        {name}
      </text>
    );
  };

  // =====================
  // UI
  // =====================
  return (
    <main
      style={{
        padding: 30,
        fontFamily: "Arial",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h1>Finance Tracker</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <p>{user.email}</p>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div
        style={{
          display: "flex",
          gap: 20,
          height: "calc(100vh - 100px)",
        }}
      >
        {/* LEFT SIDE */}
        <div
          style={{
            flex: 2,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            minHeight: 0,
          }}
        >
          {/* ADD TRANSACTION CARD */}
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 15,
              background: "white",
              flexShrink: 0,
            }}
          >
            <h3>Add Transaction</h3>

            {/* ADD CATEGORY */}
            <div style={{ marginBottom: 10 }}>
              <input
                placeholder="New category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />

              <button
                onClick={addCategory}
                style={{ marginLeft: 8 }}
              >
                Add Category
              </button>
            </div>

            {/* TRANSACTION INPUTS */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
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

              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <button onClick={addTransaction}>
                {editingId ? "Save Edit" : "Add"}
              </button>
            </div>
          </div>

          {/* TRANSACTION HISTORY */}
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 15,
              overflowY: "auto",
              flex: 1,
              minHeight: 0,
            }}
          >
            <h3>Transaction History</h3>

            {loadingData && <p>Loading transactions...</p>}

            {transactions.map((t) => (
              <div
                key={t.id}
                style={{
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: "1px solid #eee",
                }}
              >
                <strong>{t.title}</strong>

                <p
                  style={{
                    color: t.type === "income" ? "green" : "red",
                    marginTop: 4,
                    marginBottom: 8,
                  }}
                >
                  ₱{t.amount} ({t.category})
                </p>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => editTransaction(t)}>
                    Edit
                  </button>

                  <button
                    onClick={() => deleteTransaction(t.id)}
                    style={{ color: "red" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div
          style={{
            flex: 1,
            borderLeft: "1px solid #ddd",
            paddingLeft: 20,
            overflowY: "auto",
          }}
        >
          {/* OVERVIEW */}
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 15,
              marginBottom: 20,
            }}
          >
            <h2>Overview</h2>

            <p>💰 Balance: ₱{balance}</p>

            <p style={{ color: "green" }}>
              📈 Income: ₱{income}
            </p>

            <p style={{ color: "red" }}>
              📉 Expenses: ₱{expenses}
            </p>
          </div>

          {/* INCOME CHART */}
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 15,
              marginBottom: 20,
            }}
          >
            <h3 style={{ color: "green" }}>Income</h3>

            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={incomeData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    labelLine={true}
                    label={renderCustomizedLabel}
                  >
                    {incomeData.map((entry, i) => {
                      const categoryIndex = categories.indexOf(entry.name);

                      return (
                        <Cell
                          key={i}
                          fill={
                            COLORS[
                              categoryIndex >= 0
                                ? categoryIndex % COLORS.length
                                : i % COLORS.length
                            ]
                          }
                        />
                      );
                    })}
                  </Pie>

                  <Tooltip
                    formatter={(value: any) => [`₱${value}`, "Amount"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* EXPENSE CHART */}
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 15,
            }}
          >
            <h3 style={{ color: "red" }}>Expenses</h3>

            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={expenseData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    labelLine={true}
                    label={renderCustomizedLabel}
                  >
                    {expenseData.map((entry, i) => {
                      const categoryIndex = categories.indexOf(entry.name);

                      return (
                        <Cell
                          key={i}
                          fill={
                            COLORS[
                              categoryIndex >= 0
                                ? categoryIndex % COLORS.length
                                : i % COLORS.length
                            ]
                          }
                        />
                      );
                    })}
                  </Pie>

                  <Tooltip
                    formatter={(value: any) => [`₱${value}`, "Amount"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// dev notes:
// unify ui color scheme
// fix charts so it wont change colors on every render or everytime a new transaction is added (maybe use a fixed color palette and assign colors to categories based on their index in the categories array?)
// add category management (add, delete, rename categories) - maybe in a separate page or a modal?
// make edit and delete buttons a little farther from ea other
// ideate on how to show the charts only for a specific time range (this week, this month, this year, all time) - maybe add a date field to transactions and then filter them based on the selected time range before calculating the data for the charts?
// ideate on how to show the transaction history in a more compact way so that more transactions can be shown without scrolling too much - maybe a table layout with smaller font size and less padding?
// ideate on how to make the add/edit transaction form more user friendly - maybe use a modal instead of a sticky card, or at least make the inputs and buttons more visually distinct and easier to interact with?
// ideate how to make add transaction form support adding multiple transactions at once - maybe allow the user to input multiple lines of transactions in a textarea with a specific format (e.g. title, amount, category, type separated by commas) and then parse and add them all at once when the user submits the form?
// ideate how to make transaction form less click fatigue - maybe add keyboard shortcuts for adding a transaction (e.g. press Enter to submit the form, press Tab to switch between inputs, etc.)?