import { useState } from "react";
import { useNavigate } from "react-router";
import { useExpenses } from "../contexts/expense-context";
import { useTheme } from "../contexts/theme-context";
import { useCarousel } from "../hooks/use-carousel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Moon, Sun, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Plus, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const MONTH_ABBR: Record<string, string> = {
  January: "Jan", February: "Feb", March: "Mar", April: "Apr",
  May: "May", June: "Jun", July: "Jul", August: "Aug",
  September: "Sep", October: "Oct", November: "Nov", December: "Dec",
};

const MONTH_LIMIT = 3;

function fmt(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function HomePage() {
  const navigate = useNavigate();
  const { 
    months, 
    accounts, 
    addMonth, 
    getTotalSavings, 
    getMonthlyCumulativeHistory, 
    getAccountMonthTotals,
    getAccountAllTimeBalance,
    getAccountLatestTransaction
  } = useExpenses();
  const { theme, toggleTheme } = useTheme();

  const [addMonthOpen, setAddMonthOpen] = useState(false);
  const [newMonthName, setNewMonthName] = useState("January");
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());

  const totalSavings = getTotalSavings();
  
  // Target cumulative metrics to completely eliminate the negative chart dips
  const cumulativeHistory = getMonthlyCumulativeHistory();

  const lastMonthValue = cumulativeHistory[cumulativeHistory.length - 1]?.savings ?? 0;
  const prevMonthValue = cumulativeHistory[cumulativeHistory.length - 2]?.savings ?? 0;
  const monthChange = lastMonthValue - prevMonthValue;
  const isPositiveChange = monthChange >= 0;

  const chartData = cumulativeHistory.map((h) => ({ name: MONTH_ABBR[h.month] ?? h.month, savings: h.savings }));

  const green = theme === "light" ? "#16a34a" : "#22c55e";
  const red = "#dc2626";

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

        {/* Section 1: Total Net Worth Savings Milestone */}
        <section className="mb-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4" style={{ fontFamily: "var(--font-mono)" }}>Net Wealth Value</p>
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
                  <span className="text-xs text-muted-foreground">growth this period</span>
                </div>
                <div className="space-y-0">
                  {cumulativeHistory.map((h) => (
                    <div key={h.monthId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: green }} />
                        <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                          End of {MONTH_ABBR[h.month]} {h.year}
                        </span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                        {fmt(h.savings)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 md:p-8 flex flex-col justify-center">
                <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>Accumulation Curve</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={green} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                    {/* Fixed Color Injections: Solves dark mode unreadable font errors */}
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
                      itemStyle={{ color: "var(--foreground)" }}
                      labelStyle={{ color: "var(--muted-foreground)" }}
                      formatter={(v: number) => [`${fmt(v)}`, "Net Worth"]}
                    />
                    <Area type="monotone" dataKey="savings" stroke={green} strokeWidth={2} fill="url(#savingsGrad)" dot={false} activeDot={{ r: 4, fill: green, stroke: "var(--card)", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Account Monthly Balances (Including Rolling Carry-Overs) */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>Monthly Balance Overview</p>
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
                    <Plus className="h-3 w-3" /> Add Month
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
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Year</Label>
                      <Input type="number" value={newMonthYear} onChange={(e) => setNewMonthYear(parseInt(e.target.value, 10))} min={2000} max={2100} />
                    </div>
                    {alreadyExists && <p className="text-xs text-destructive">{newMonthName} {newMonthYear} already exists.</p>}
                    <Button onClick={handleAddMonth} className="w-full" disabled={alreadyExists}>Add Month</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleMonths.map((month, i) => {
              // Calculate rolling cumulative total balance up to this targeted month end
              let combinedCurrentBalance = 0;
              accounts.forEach(acc => {
                const { currentBalance } = getAccountMonthTotals(acc.id, month.id);
                combinedCurrentBalance += currentBalance;
              });

              const pos = combinedCurrentBalance >= 0;
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
                  <div className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/40 transition-all p-5 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>{month.year}</p>
                        <h3 className="text-lg font-semibold mt-0.5">{month.month}</h3>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Rolling Total Balance</span>
                      <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)", color: pos ? green : red }}>
                        {fmt(combinedCurrentBalance)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Accounts Snapshot */}
        <section>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4" style={{ fontFamily: "var(--font-mono)" }}>Accounts Balance Snapshot</p>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {accounts.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">No active accounts found. Create one inside a monthly sheet!</div>
            ) : (
              <div className="divide-y divide-border">
                {accounts.map((acc, i) => {
                  const balance = getAccountAllTimeBalance(acc.id);
                  const latestTx = getAccountLatestTransaction(acc.id);
                  const isPositiveBalance = balance >= 0;

                  return (
                    <div key={acc.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground flex-shrink-0">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{acc.name}</p>
                          {latestTx ? (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <span>Last entry:</span>
                              <span className="font-medium text-foreground">{latestTx.label}</span>
                              <span style={{ color: latestTx.type === 'income' ? green : red }} className="font-semibold">
                                ({latestTx.type === 'income' ? '+' : '−'}{fmt(latestTx.amount)})
                              </span>
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1 italic">No transactions processed yet</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="sm:text-right flex items-center sm:flex-col justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                        <span className="text-xs text-muted-foreground sm:hidden">Total Balance</span>
                        <p className="text-base font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)", color: isPositiveBalance ? green : red }}>
                          {fmt(balance)}
                        </p>
                      </div>
                    </div>
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