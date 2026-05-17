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
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [type, setType] = useState<"income" | "expense">("expense");

  const [categories, setCategories] = useState([
    "Food",
    "Transport",
    "School",
    "Savings",
    "Entertainment",
    "Other",
  ]);

  const [customCategory, setCustomCategory] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [colorPicker, setColorPicker] = useState<string | null>(null);

  // CATEGORY COLORS (CUSTOMIZABLE)
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(
    {}
  );

  const DEFAULT_COLORS = [
    "#FF4D4D",
    "#4DA6FF",
    "#4DFF88",
    "#FFB84D",
    "#B84DFF",
    "#00C2FF",
    "#FF66C4",
  ];

  // ================= AUTH =================
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setLoadingAuth(false);
    };

    init();
  }, []);

  // ================= FETCH =================
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoadingData(true);

      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id);

      setTransactions(data ?? []);
      setLoadingData(false);
    };

    fetchData();
  }, [user]);

  // ================= COLORS =================
  function getColor(category: string, index: number) {
    return categoryColors[category] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  }

  function setCategoryColor(cat: string, color: string) {
    setCategoryColors((prev) => ({
      ...prev,
      [cat]: color,
    }));
  }

  // ================= DATA =================
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

  // ================= CHART CUSTOM LABEL =================
  const renderLabel = (entry: any) => {
    return entry.name; // ONLY CATEGORY shown on pie
  };

  // ================= ADD =================
  async function addTransaction() {
    if (!title.trim() || !amount.trim()) return;

    const amountNum = Number(amount);

    const { data } = await supabase
      .from("transactions")
      .insert([
        {
          title,
          amount: amountNum,
          category,
          type,
          user_id: user.id,
        },
      ])
      .select();

    if (data?.[0]) {
      setTransactions((p) => [data[0], ...p]);
    }

    setTitle("");
    setAmount("");
  }

  // ================= DELETE =================
  async function deleteTransaction(id: number) {
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((p) => p.filter((t) => t.id !== id));
  }

  if (loadingAuth) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <main style={{ display: "flex", height: "100vh", fontFamily: "Arial" }}>

      {/* LEFT: ANALYTICS */}
      <div style={{ width: 420, borderRight: "1px solid #ddd", padding: 20 }}>

        <h2>Expenses</h2>

        <div style={{ position: "relative" }}>

          {/* 3 DOT MENU (GLOBAL FOR CHART) */}
          <div
            style={{
              position: "absolute",
              right: 10,
              top: 10,
              cursor: "pointer",
            }}
            onClick={() => setOpenMenu(openMenu ? null : "main")}
          >
            ⋮
          </div>

          {openMenu && (
            <div
              style={{
                position: "absolute",
                right: 10,
                top: 30,
                background: "white",
                border: "1px solid #ddd",
                padding: 10,
                zIndex: 10,
              }}
            >
              <button onClick={() => setColorPicker("open")}>
                Change Colors
              </button>
            </div>
          )}

          {colorPicker && (
            <div
              style={{
                position: "fixed",
                top: "40%",
                left: "40%",
                background: "white",
                padding: 20,
                border: "1px solid #ccc",
              }}
            >
              <h4>Pick Category Colors</h4>

              {expenseData.map((d, i) => (
                <div key={d.name} style={{ marginBottom: 10 }}>
                  <span>{d.name}</span>
                  <input
                    type="color"
                    value={categoryColors[d.name] || DEFAULT_COLORS[i]}
                    onChange={(e) => setCategoryColor(d.name, e.target.value)}
                  />
                </div>
              ))}

              <button onClick={() => setColorPicker(null)}>Close</button>
            </div>
          )}

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={expenseData}
                  dataKey="value"
                  nameKey="name"
                  label={renderLabel} // CATEGORY ONLY
                  outerRadius={110}
                >
                  {expenseData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={getColor(entry.name, i)}
                    />
                  ))}
                </Pie>

                {/* ONLY SHOW AMOUNT ON HOVER */}
                <Tooltip formatter={(value: any) => [`₱${value}`, "Amount"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RIGHT: TRANSACTIONS */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>

        <h2>Add Transaction</h2>

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

        <button onClick={addTransaction}>Add</button>

        <hr style={{ margin: "20px 0" }} />

        <h2>History</h2>

        {transactions.map((t) => (
          <div key={t.id} style={{ marginBottom: 10 }}>
            <b>{t.title}</b>
            <p>₱{t.amount} ({t.category})</p>

            <button onClick={() => deleteTransaction(t.id)}>Delete</button>
          </div>
        ))}
      </div>
    </main>
  );
}