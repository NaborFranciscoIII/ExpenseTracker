import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useExpenses } from "../contexts/expense-context";
import { useTheme } from "../contexts/theme-context";
import { useCarousel } from "../hooks/use-carousel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ArrowLeft, Moon, Sun, Plus, Pencil, Trash2, Check, X, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

function fmt(n: number, currency: string = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

interface EditState {
  type: "income" | "expense";
  amount: string;
  date: string;
  label: string;
}

export function HistoryPage() {
  const { monthId, accountId } = useParams<{ monthId: string; accountId: string }>();
  const navigate = useNavigate();
  const { months, accounts, getAccountTransactions, getAccountMonthTotals, addTransaction, updateTransaction, deleteTransaction } = useExpenses();
  const { theme, toggleTheme } = useTheme();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ type: "expense", amount: "", date: "", label: "" });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTx, setNewTx] = useState<EditState>({ type: "expense", amount: "", date: "", label: "" });

  const month = months.find((m) => m.id === monthId);
  const account = accounts.find((a) => a.id === accountId);

  const green = theme === "light" ? "#16a34a" : "#22c55e";
  const red = "#dc2626";

  if (!month || !account) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Account or month not found.</p>
          <Button onClick={() => navigate("/")}>Go home</Button>
        </div>
      </div>
    );
  }

  const transactions = getAccountTransactions(accountId!, monthId!);
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const TX_LIMIT = 6;
  const txCarousel = useCarousel(sorted, TX_LIMIT, false);
  const { income, expenses, savings } = getAccountMonthTotals(accountId!, monthId!);
  const pos = savings >= 0;

  const startEdit = (tx: typeof transactions[0]) => {
    setEditingId(tx.id);
    setEditState({ type: tx.type, amount: tx.amount.toString(), date: tx.date, label: tx.label });
  };

  const confirmEdit = () => {
    if (!editingId || !editState.label.trim() || !editState.amount || !editState.date) return;
    updateTransaction(accountId!, monthId!, editingId, {
      type: editState.type,
      amount: parseFloat(editState.amount),
      date: editState.date,
      label: editState.label.trim(),
    });
    setEditingId(null);
  };

  // Find your handleAdd function inside history-page.tsx and update it:
  const handleAdd = async () => {
      if (!newTx.label.trim() || !newTx.amount || !newTx.date) return;
      
      try {
        // Adjusted arguments to cleanly map to your three-parameter context configuration signature
        await addTransaction(accountId!, monthId!,{
            type: newTx.type as "income" | "expense",
            amount: parseFloat(newTx.amount),
            date: newTx.date,
            label: newTx.label.trim(),
          });
        
        setNewTx({ type: "expense", amount: "", date: "", label: "" });
        setAddDialogOpen(false);
      } catch (error) {
        console.error("Failed to commit transaction record:", error);
      }
    };

  const summaryCards = [
    { label: "Total Income", value: income, color: green },
    { label: "Total Expenses", value: expenses, color: red },
    { label: "Net Savings", value: savings, color: pos ? green : red, prefix: pos ? "+" : "−", abs: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/month/${monthId}`)} className="rounded-full h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                {month.month} {month.year}
              </p>
              <h1 className="text-xl font-semibold tracking-tight">{account.name}</h1>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full h-9 w-9">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>

        {/* Section 1: Summary */}
        <section className="mb-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4" style={{ fontFamily: "var(--font-mono)" }}>Summary</p>
          <div className="grid grid-cols-3 gap-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="bg-card rounded-2xl border border-border shadow-sm p-4">
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p
                  className="text-lg font-semibold tabular-nums"
                  style={{ fontFamily: "var(--font-mono)", color: card.color }}
                >
                  {card.prefix ?? ""}{card.abs ? fmt(Math.abs(card.value)) : fmt(card.value)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Transaction History */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              Transaction History
            </p>
            <div className="flex items-center gap-1.5">
              {txCarousel.total > TX_LIMIT && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={txCarousel.goPrev} disabled={!txCarousel.canPrev}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums px-1" style={{ fontFamily: "var(--font-mono)" }}>
                    {txCarousel.startIdx + 1}–{Math.min(txCarousel.startIdx + TX_LIMIT, txCarousel.total)} / {txCarousel.total}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={txCarousel.goNext} disabled={!txCarousel.canNext}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full h-7 px-3 gap-1 text-xs ml-1">
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {/* Type toggle */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["income", "expense"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setNewTx((p) => ({ ...p, type: t }))}
                          className="py-2 px-3 rounded-lg text-sm font-medium border transition-all capitalize"
                          style={{
                            background: newTx.type === t ? (t === "income" ? green : red) : "var(--card)",
                            color: newTx.type === t ? "#fff" : "var(--muted-foreground)",
                            borderColor: newTx.type === t ? (t === "income" ? green : red) : "var(--border)",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new-label" className="text-xs text-muted-foreground mb-1 block">Label</Label>
                    <Input id="new-label" placeholder="e.g., Rent, Salary" value={newTx.label} onChange={(e) => setNewTx((p) => ({ ...p, label: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="new-amount" className="text-xs text-muted-foreground mb-1 block">Amount</Label>
                    <Input id="new-amount" type="number" step="0.01" min="0" placeholder="0.00" value={newTx.amount} onChange={(e) => setNewTx((p) => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="new-date" className="text-xs text-muted-foreground mb-1 block">Date</Label>
                    <Input id="new-date" type="date" value={newTx.date} onChange={(e) => setNewTx((p) => ({ ...p, date: e.target.value }))} />
                  </div>
                  <Button onClick={handleAdd} className="w-full">Add Transaction</Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {sorted.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                No transactions yet. Add your first one!
              </div>
            ) : (
              <div className="divide-y divide-border">
                {txCarousel.visible.map((tx, i) => {
                  const isEditing = editingId === tx.id;
                  const txPos = tx.type === "income";
                  const iconBg = txPos
                    ? (theme === "light" ? "#dcfce7" : "#172417")
                    : (theme === "light" ? "#fee2e2" : "#2d1515");

                  if (isEditing) {
                    return (
                      <motion.div
                        key={`${tx.id}-edit`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 bg-muted/30"
                      >
                        {/* Edit type toggle */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {(["income", "expense"] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => setEditState((p) => ({ ...p, type: t }))}
                              className="py-1.5 px-2 rounded-lg text-xs font-medium border transition-all capitalize"
                              style={{
                                background: editState.type === t ? (t === "income" ? green : red) : "var(--card)",
                                color: editState.type === t ? "#fff" : "var(--muted-foreground)",
                                borderColor: editState.type === t ? (t === "income" ? green : red) : "var(--border)",
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <Input
                            value={editState.label}
                            onChange={(e) => setEditState((p) => ({ ...p, label: e.target.value }))}
                            placeholder="Label"
                            className="h-8 text-sm"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={editState.amount}
                            onChange={(e) => setEditState((p) => ({ ...p, amount: e.target.value }))}
                            placeholder="Amount"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={editState.date}
                            onChange={(e) => setEditState((p) => ({ ...p, date: e.target.value }))}
                            className="h-8 text-sm flex-1"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={confirmEdit}>
                            <Check className="h-4 w-4" style={{ color: green }} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={`${tx.id}-${txCarousel.startIdx}`}
                      initial={{ x: txCarousel.direction * 30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.18, ease: "easeOut", delay: i * 0.05 }}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: iconBg }}
                        >
                          {txPos
                            ? <ArrowUpRight className="h-3.5 w-3.5" style={{ color: green }} />
                            : <ArrowDownRight className="h-3.5 w-3.5" style={{ color: red }} />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{tx.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>{tx.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-semibold tabular-nums mr-1"
                          style={{ fontFamily: "var(--font-mono)", color: txPos ? green : red }}
                        >
                          {txPos ? "+" : "−"}{fmt(tx.amount)}
                        </p>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(tx)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteTransaction(accountId!, monthId!, tx.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
