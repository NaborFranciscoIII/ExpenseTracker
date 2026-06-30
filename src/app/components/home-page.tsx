import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useExpenses } from "../contexts/expense-context";
import { useAuth } from "../contexts/auth-context";
import { useTheme } from "../contexts/theme-context";
import { useCarousel } from "../hooks/use-carousel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Moon, Sun, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion } from "motion/react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const MONTH_ABBR: Record<string, string> = {
  January: "Jan", February: "Feb", March: "Mar", April: "Apr",
  May: "May", June: "Jun", July: "Jul", August: "Aug",
  September: "Sep", October: "Oct", November: "Nov", December: "Dec",
};

const MONTH_LIMIT = 3;

function fmt(n: number, currency: string = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}


export function HomePage() {
  // Place these lines at the top of your HomePage component function
  const navigate = useNavigate();
  const { months, accounts, loading, fetchFinanceData, addMonth, getTotalSavings, getMonthlySavingsHistory, getAllRecentTransactions, getMonthTotals} = useExpenses();
  const { theme, toggleTheme } = useTheme();

fetchFinanceData();

  const [addMonthOpen, setAddMonthOpen] = useState(false);
  const [newMonthName, setNewMonthName] = useState("January");
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());

  const totalSavings = getTotalSavings();
  const history = getMonthlySavingsHistory();
  const recentTx = getAllRecentTransactions(10);

  const lastMonth = history[history.length - 1];
  const prevMonth = history[history.length - 2];
  const monthChange = lastMonth && prevMonth ? lastMonth.savings - prevMonth.savings : lastMonth?.savings ?? 0;
  const isPositiveChange = monthChange >= 0;

  const chartData = history.map((h) => ({ name: MONTH_ABBR[h.month] ?? h.month, savings: h.savings }));

  const green = theme === "light" ? "#16a34a" : "#22c55e";
  const red = "#dc2626";

  // Carousel: months are sorted oldest→newest; start at end so newest 3 are visible
  const { visible: visibleMonths, startIdx, direction, canPrev, canNext, goPrev, goNext, total } = useCarousel(months, MONTH_LIMIT, true);

  const handleAddMonth = () => {
    addMonth(newMonthName, newMonthYear);
    setAddMonthOpen(false);
  };

  const alreadyExists = months.some((m) => m.month === newMonthName && m.year === newMonthYear);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1" style={{ fontFamily: "var(--font-mono)" }}>Personal Finance</p>
            <h1 className="text-2xl font-semibold tracking-tight">Expense Tracker</h1>
          </div>
          <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full border-border h-9 w-9">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>

        {/* Section 1: Total Savings */}
        <section className="mb-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4" style={{ fontFamily: "var(--font-mono)" }}>Total Savings</p>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-border">
                <div className="mb-3">
                  <span className="text-4xl sm:text-5xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmt(totalSavings)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-6">
                  {isPositiveChange ? (
                    <div className="flex items-center gap-1 text-sm font-medium" style={{ color: green }}>
                      <TrendingUp className="h-4 w-4" />
                      <span style={{ fontFamily: "var(--font-mono)" }}>+{fmt(monthChange)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-sm font-medium" style={{ color: red }}>
                      <TrendingDown className="h-4 w-4" />
                      <span style={{ fontFamily: "var(--font-mono)" }}>−{fmt(Math.abs(monthChange))}</span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">vs {prevMonth?.month ?? "prior month"}</span>
                </div>
                <div className="space-y-0">
                  {history.map((h) => {
                    const pos = h.savings >= 0;
                    return (
                      <div key={h.monthId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          {pos
                            ? <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: green }} />
                            : <ArrowDownRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: red }} />
                          }
                          <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                            {MONTH_ABBR[h.month]} {h.year}
                          </span>
                        </div>
                        <span className="text-xs font-medium tabular-nums" style={{ fontFamily: "var(--font-mono)", color: pos ? green : red }}>
                          {pos ? "+" : "−"}{fmt(Math.abs(h.savings))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 md:p-8 flex flex-col justify-center">
                <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>Savings Trend</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={green} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
                      formatter={(v: number) => [`${fmt(v)}`, "Savings"]}
                    />
                    <Area type="monotone" dataKey="savings" stroke={green} strokeWidth={2} fill="url(#savingsGrad)" dot={false} activeDot={{ r: 4, fill: green, stroke: "var(--card)", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Monthly Overview with carousel + add month */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>Monthly Overview</p>
            <div className="flex items-center gap-1.5">
              {total > MONTH_LIMIT && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={goPrev} disabled={!canPrev}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums px-1" style={{ fontFamily: "var(--font-mono)" }}>
                    {startIdx + 1}–{Math.min(startIdx + MONTH_LIMIT, total)} / {total}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={goNext} disabled={!canNext}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              <Dialog open={addMonthOpen} onOpenChange={setAddMonthOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-full h-7 px-3 gap-1 text-xs ml-1">
                    <Plus className="h-3 w-3" />
                    Add Month
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Month</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Month</Label>
                      <Select value={newMonthName} onValueChange={setNewMonthName}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Year</Label>
                      <Input
                        type="number"
                        value={newMonthYear}
                        onChange={(e) => setNewMonthYear(parseInt(e.target.value, 10))}
                        min={2000}
                        max={2100}
                      />
                    </div>
                    {alreadyExists && (
                      <p className="text-xs text-destructive">{newMonthName} {newMonthYear} already exists.</p>
                    )}
                    <Button onClick={handleAddMonth} className="w-full" disabled={alreadyExists}>
                      Add Month
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleMonths.map((month, i) => {
              const { income, expenses, savings } = getMonthTotals(month.id);
              const savingsRate = income > 0 ? (savings / income) * 100 : 0;
              const pos = savings >= 0;
              const bgBadge = pos
                ? (theme === "light" ? "#dcfce7" : "#172417")
                : (theme === "light" ? "#fee2e2" : "#2d1515");

              return (
                <motion.div
                  key={`${month.id}-${startIdx}`}
                  initial={{ x: direction * 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut", delay: i * 0.06 }}
                  whileHover={{ scale: 1.025, y: -3 }}
                  whileTap={{ scale: 0.975 }}
                  className="cursor-pointer"
                  onClick={() => navigate(`/month/${month.id}`)}
                >
                  <div className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/40 transition-all h-full p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>{month.year}</p>
                        <h3 className="text-lg font-semibold mt-0.5">{month.month}</h3>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: bgBadge, color: pos ? green : red, fontFamily: "var(--font-mono)" }}>
                        {pos ? "▲" : "▼"} {Math.abs(savingsRate).toFixed(0)}%
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Income</span>
                        <span className="text-sm font-medium tabular-nums" style={{ fontFamily: "var(--font-mono)", color: green }}>+{fmt(income)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Expenses</span>
                        <span className="text-sm font-medium tabular-nums" style={{ fontFamily: "var(--font-mono)", color: red }}>−{fmt(expenses)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-border">
                        <span className="text-xs text-muted-foreground">Savings</span>
                        <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)", color: pos ? green : red }}>
                          {pos ? "+" : "−"}{fmt(Math.abs(savings))}
                        </span>
                      </div>
                    </div>

                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, Math.min(savingsRate, 100))}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        style={{ background: pos ? green : red }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Recent Transactions */}
        <section>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4" style={{ fontFamily: "var(--font-mono)" }}>Recent Transactions</p>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {recentTx.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">No transactions yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {recentTx.map((tx, i) => {
                  const pos = tx.type === "income";
                  const iconBg = pos
                    ? (theme === "light" ? "#dcfce7" : "#172417")
                    : (theme === "light" ? "#fee2e2" : "#2d1515");
                  return (
                    <motion.div
                      key={`${tx.id}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                          {pos
                            ? <ArrowUpRight className="h-3.5 w-3.5" style={{ color: green }} />
                            : <ArrowDownRight className="h-3.5 w-3.5" style={{ color: red }} />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{tx.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tx.accountName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)", color: pos ? green : red }}>
                          {pos ? "+" : "−"}{fmt(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>{tx.date}</p>
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
