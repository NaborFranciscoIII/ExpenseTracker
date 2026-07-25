import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useExpenses } from "../contexts/expense-context";
import { useTheme } from "../contexts/theme-context";
import { useCarousel } from "../hooks/use-carousel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Moon, Sun, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Plus, Wallet, AlertCircle, PieChart as PieChartIcon, Target } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, PieChart, Pie, Cell, BarChart, Bar, YAxis } from "recharts";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_ABBR: Record<string, string> = { January: "Jan", February: "Feb", March: "Mar", April: "Apr", May: "May", June: "Jun", July: "Jul", August: "Aug", September: "Sep", October: "Oct", November: "Nov", December: "Dec" };
const PIE_COLORS = ["#16a34a", "#2563eb", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#ca8a04"];
const MONTH_LIMIT = 3;

function fmt(n: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function HomePage() {
  const navigate = useNavigate();
  const { 
    months, accounts, addMonth, getTotalSavings, getMonthlyCumulativeHistory, 
    getAccountMonthTotals, getAccountAllTimeBalance, getAccountLatestTransaction,
    getPendingRecurring, approvePendingRecurring, getMonthCategoryBreakdown
  } = useExpenses();
  const { theme, toggleTheme } = useTheme();

  const [addMonthOpen, setAddMonthOpen] = useState(false);
  const [newMonthName, setNewMonthName] = useState("January");
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());
  
  // Phase 3: Smart Boot-Up Modal State
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const pendingBills = getPendingRecurring();

  // Phase 3: Analytics Carousel State
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    // Intercept user on boot if they have missed recurring bills
    if (pendingBills.length > 0) {
      setPendingModalOpen(true);
    }
  }, [pendingBills.length]);

  const handleApproveBills = async () => {
    await approvePendingRecurring();
    setPendingModalOpen(false);
  };

  const totalSavings = getTotalSavings();
  const cumulativeHistory = getMonthlyCumulativeHistory();
  const lastMonthValue = cumulativeHistory[cumulativeHistory.length - 1]?.savings ?? 0;
  const prevMonthValue = cumulativeHistory[cumulativeHistory.length - 2]?.savings ?? 0;
  const monthChange = lastMonthValue - prevMonthValue;
  const isPositiveChange = monthChange >= 0;
  const chartData = cumulativeHistory.map((h) => ({ name: MONTH_ABBR[h.month] ?? h.month, savings: h.savings }));

  const green = theme === "light" ? "#16a34a" : "#22c55e";
  const red = "#dc2626";

  const { visible: visibleMonths, startIdx, direction, canPrev, canNext, goPrev, goNext, total } = useCarousel(months, MONTH_LIMIT, true);

  const handleAddMonth = () => { addMonth(newMonthName, newMonthYear); setAddMonthOpen(false); };
  const alreadyExists = months.some((m) => m.month === newMonthName && m.year === newMonthYear);

  // Phase 3: Analytics Data Prep (Uses the most recent month for insights)
  const latestMonth = months[months.length - 1];
  const categoryData = latestMonth ? getMonthCategoryBreakdown(latestMonth.id) : [];
  const pieData = categoryData.map(d => ({ name: d.category, value: d.spent })).filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* Smart Boot-up Modal for Recurring Bills */}
      <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-5 w-5" /> Pending Bills Detected
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              While you were away, {pendingBills.length} recurring transaction(s) passed their due date.
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pendingBills.map(b => (
                <div key={b.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{b.label}</p>
                    <p className="text-xs text-muted-foreground">Due: {b.nextDueDate}</p>
                  </div>
                  <span style={{ color: b.type === 'income' ? green : red, fontFamily: "var(--font-mono)" }}>
                    {b.type === 'income' ? '+' : '-'}{fmt(b.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingModalOpen(false)}>Ignore for now</Button>
            <Button onClick={handleApproveBills} className="gap-2">Approve & Log All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

        {/* Section 1: Net Wealth Value */}
        <section className="mb-10">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-border">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "var(--font-mono)" }}>Net Wealth Value</p>
                <div className="mb-3">
                  <span className="text-4xl sm:text-5xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmt(totalSavings)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-6">
                  {isPositiveChange ? (
                    <div className="flex items-center gap-1 text-sm font-medium" style={{ color: green }}>
                      <TrendingUp className="h-4 w-4" /> <span style={{ fontFamily: "var(--font-mono)" }}>+{fmt(monthChange)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-sm font-medium" style={{ color: red }}>
                      <TrendingDown className="h-4 w-4" /> <span style={{ fontFamily: "var(--font-mono)" }}>−{fmt(Math.abs(monthChange))}</span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">growth this period</span>
                </div>
              </div>

              <div className="p-6 md:p-8 flex flex-col justify-center">
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={green} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" hide />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--foreground)" }} itemStyle={{ color: "var(--foreground)" }} labelStyle={{ color: "var(--muted-foreground)" }} formatter={(v: number) => [`${fmt(v)}`, "Net Worth"]} />
                    <Area type="monotone" dataKey="savings" stroke={green} strokeWidth={2} fill="url(#savingsGrad)" dot={false} activeDot={{ r: 4, fill: green, stroke: "var(--card)", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Phase 3: Multi-Slide Analytics Carousel */}
        {latestMonth && categoryData.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                {latestMonth.month} Insights
              </p>
              <div className="flex gap-2">
                <Button variant={activeSlide === 0 ? "default" : "outline"} size="sm" className="h-7 rounded-full text-xs px-3" onClick={() => setActiveSlide(0)}>
                  <PieChartIcon className="h-3 w-3 mr-1.5" /> Breakdown
                </Button>
                <Button variant={activeSlide === 1 ? "default" : "outline"} size="sm" className="h-7 rounded-full text-xs px-3" onClick={() => setActiveSlide(1)}>
                  <Target className="h-3 w-3 mr-1.5" /> Budgets
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-5 relative overflow-hidden min-h-[260px]">
              <AnimatePresence mode="wait">
                {activeSlide === 0 ? (
                  <motion.div key="slide1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="h-full flex flex-col md:flex-row items-center gap-6">
                    <div className="w-full md:w-1/2 h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                            {pieData.map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", fontFamily: "var(--font-mono)" }} formatter={(v: number) => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 space-y-3">
                      <h3 className="font-semibold text-sm border-b border-border pb-2">Top Spending Categories</h3>
                      {categoryData.slice(0, 4).map((d, i) => (
                        <div key={d.category} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-muted-foreground">{d.category}</span>
                          </div>
                          <span className="font-mono font-medium">{fmt(d.spent)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="slide2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
                    <h3 className="font-semibold text-sm mb-4">Category Budget Health</h3>
                    <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
                      {categoryData.filter(d => d.limit > 0).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No active budgets set for this month. Set them in the Month view!</p>
                      ) : (
                        categoryData.filter(d => d.limit > 0).map(d => {
                          const percent = Math.min((d.spent / d.limit) * 100, 100);
                          const isOver = d.spent > d.limit;
                          return (
                            <div key={d.category} className="space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{d.category}</span>
                                <span className="font-mono text-xs text-muted-foreground">{fmt(d.spent)} / {fmt(d.limit)}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: isOver ? red : green }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Section 2: Monthly Overview */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>Monthly Balance Overview</p>
            <div className="flex items-center gap-1.5">
              {total > MONTH_LIMIT && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={goPrev} disabled={!canPrev}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <span className="text-xs text-muted-foreground tabular-nums px-1" style={{ fontFamily: "var(--font-mono)" }}>{startIdx + 1}–{Math.min(startIdx + MONTH_LIMIT, total)} / {total}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={goNext} disabled={!canNext}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </>
              )}
              <Dialog open={addMonthOpen} onOpenChange={setAddMonthOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-full h-7 px-3 gap-1 text-xs ml-1"><Plus className="h-3 w-3" /> Add Month</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Month</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Month</Label>
                      <Select value={newMonthName} onValueChange={setNewMonthName}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MONTH_NAMES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs text-muted-foreground mb-1.5 block">Year</Label><Input type="number" value={newMonthYear} onChange={(e) => setNewMonthYear(parseInt(e.target.value, 10))} min={2000} max={2100} /></div>
                    {alreadyExists && <p className="text-xs text-destructive">{newMonthName} {newMonthYear} already exists.</p>}
                    <Button onClick={handleAddMonth} className="w-full" disabled={alreadyExists}>Add Month</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleMonths.map((month, i) => {
              let combinedCurrentBalance = 0;
              accounts.forEach(acc => { combinedCurrentBalance += getAccountMonthTotals(acc.id, month.id).currentBalance; });
              const pos = combinedCurrentBalance >= 0;
              return (
                <motion.div key={`${month.id}-${startIdx}`} initial={{ x: direction * 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut", delay: i * 0.06 }} whileHover={{ scale: 1.025, y: -3 }} whileTap={{ scale: 0.975 }} className="cursor-pointer" onClick={() => navigate(`/month/${month.id}`)}>
                  <div className="bg-card rounded-2xl border border-border shadow-sm hover:border-primary/40 p-5 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>{month.year}</p>
                        <h3 className="text-lg font-semibold mt-0.5">{month.month}</h3>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Rolling Total</span>
                      <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)", color: pos ? green : red }}>{fmt(combinedCurrentBalance)}</span>
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
              <div className="py-16 text-center text-muted-foreground text-sm">No active accounts found.</div>
            ) : (
              <div className="divide-y divide-border">
                {accounts.map((acc) => {
                  const balance = getAccountAllTimeBalance(acc.id);
                  const latestTx = getAccountLatestTransaction(acc.id);
                  return (
                    <div key={acc.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground flex-shrink-0"><Wallet className="h-4 w-4" /></div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{acc.name}</p>
                          {latestTx ? (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><span>Last entry:</span> <span className="font-medium text-foreground">{latestTx.label}</span> <span style={{ color: latestTx.type === 'income' ? green : red }} className="font-semibold">({latestTx.type === 'income' ? '+' : '−'}{fmt(latestTx.amount)})</span></p>
                          ) : <p className="text-xs text-muted-foreground mt-1 italic">No transactions</p>}
                        </div>
                      </div>
                      <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                        <span className="text-xs text-muted-foreground sm:hidden">Total Balance</span>
                        <p className="text-base font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)", color: balance >= 0 ? green : red }}>{fmt(balance)}</p>
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