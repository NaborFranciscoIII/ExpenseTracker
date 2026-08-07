import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useExpenses } from "../contexts/expense-context";
import { useTheme } from "../contexts/theme-context";
import { useSettings } from "../contexts/settings-context"; 
import { useCarousel } from "../hooks/use-carousel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Moon, Sun, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Plus, Wallet, AlertCircle, PieChart as PieChartIcon, Target } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, PieChart, Pie, Cell } from "recharts";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_ABBR: Record<string, string> = { January: "Jan", February: "Feb", March: "Mar", April: "Apr", May: "May", June: "Jun", July: "Jul", August: "Aug", September: "Sep", October: "Oct", November: "Nov", December: "Dec" };
const PIE_COLORS = ["#16a34a", "#2563eb", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#ca8a04"];
const MONTH_LIMIT = 3;

export function HomePage() {
  const navigate = useNavigate();
  const { 
    months, accounts, addMonth, getTotalSavings, getMonthlyCumulativeHistory, 
    getAccountMonthTotals, getAccountAllTimeBalance, getAccountLatestTransaction,
    getPendingRecurring, approvePendingRecurring, getMonthCategoryBreakdown, getFinancialHealthScore
  } = useExpenses();
  const { theme, toggleTheme } = useTheme();
  
  // Dynamic formatter pulled from the global settings context
  const { formatCurrency } = useSettings(); 

  const [addMonthOpen, setAddMonthOpen] = useState(false);
  const [newMonthName, setNewMonthName] = useState("January");
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());
  
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const pendingBills = getPendingRecurring();
  const [activeSlide, setActiveSlide] = useState(0);

  // Timeframe Toggle logic
  const [timeframe, setTimeframe] = useState<'6months' | 'year' | 'all'>('6months');

  useEffect(() => {
    if (pendingBills.length > 0) setPendingModalOpen(true);
  }, [pendingBills.length]);

  const handleApproveBills = async () => {
    await approvePendingRecurring();
    setPendingModalOpen(false);
  };

  const totalSavings = getTotalSavings();
  const rawHistory = getMonthlyCumulativeHistory();
  
  const cumulativeHistory = useMemo(() => {
    if (timeframe === 'year') {
      const currentYear = new Date().getFullYear();
      return rawHistory.filter(h => h.year === currentYear);
    }
    if (timeframe === '6months') return rawHistory.slice(-6);
    return rawHistory;
  }, [rawHistory, timeframe]);

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

  const latestMonth = months[months.length - 1];
  const categoryData = latestMonth ? getMonthCategoryBreakdown(latestMonth.id) : [];
  const pieData = categoryData.map(d => ({ name: d.category, value: d.spent })).filter(d => d.value > 0);

  const healthScore = latestMonth ? getFinancialHealthScore(latestMonth.id) : 100;
  const getHealthStatus = (score: number) => {
    if(score >= 80) return { label: 'Excellent', color: '#16a34a' }; 
    if(score >= 50) return { label: 'Fair', color: '#ca8a04' }; 
    return { label: 'Needs Attention', color: '#dc2626' }; 
  };
  const { label: healthLabel, color: healthColor } = getHealthStatus(healthScore);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* Pending Bills Modal */}
      <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-amber-500"><AlertCircle className="h-5 w-5" /> Pending Bills Detected</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">While you were away, {pendingBills.length} recurring transaction(s) passed their due date.</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pendingBills.map(b => (
                <div key={b.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg text-sm">
                  <div><p className="font-medium">{b.label}</p><p className="text-xs text-muted-foreground">Due: {b.nextDueDate}</p></div>
                  <span style={{ color: b.type === 'income' ? green : red, fontFamily: "var(--font-mono)" }}>
                    {b.type === 'income' ? '+' : '-'}{formatCurrency(b.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingModalOpen(false)}>Ignore</Button>
            <Button onClick={handleApproveBills} className="gap-2">Approve All</Button>
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

      {/* Section 1: Net Wealth, Health Score & Growth Chart */}
        <section className="mb-10">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4">
              
              {/* Card 1/4: Net Wealth */}
              <div className="p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-border flex flex-col justify-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "var(--font-mono)" }}>Net Wealth Value</p>
                <div className="mb-3">
                  <span className="text-4xl sm:text-5xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>
                    {formatCurrency(totalSavings)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isPositiveChange ? (
                    <div className="flex items-center gap-1 text-sm font-medium" style={{ color: green }}>
                      <TrendingUp className="h-4 w-4" /> <span style={{ fontFamily: "var(--font-mono)" }}>+{formatCurrency(monthChange)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-sm font-medium" style={{ color: red }}>
                      <TrendingDown className="h-4 w-4" /> <span style={{ fontFamily: "var(--font-mono)" }}>−{formatCurrency(Math.abs(monthChange))}</span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">growth this period</span>
                </div>
              </div>

              {/* Card 2/4: Financial Health Gauge (NEW) */}
              <div className="p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-border flex flex-col items-center justify-center bg-muted/10">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 w-full text-center" style={{ fontFamily: "var(--font-mono)" }}>Financial Health</p>
                <div className="relative flex items-center justify-center">
                  <svg className="transform -rotate-90 w-24 h-24">
                    <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/20" />
                    {/* The colored animated progress ring */}
                    <circle 
                      cx="48" cy="48" r={radius} 
                      stroke={healthColor} strokeWidth="8" fill="transparent" 
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
                      className="transition-all duration-1000 ease-out drop-shadow-sm" 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tracking-tighter" style={{ fontFamily: "var(--font-mono)", color: healthColor }}>{healthScore}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: healthColor }}></div>
                  <p className="text-sm font-medium">{healthLabel}</p>
                </div>
              </div>

              {/* Card 3/4 & 4/4: The Growth Chart (Span 2 columns) */}
              <div className="p-6 md:p-8 lg:col-span-2 flex flex-col justify-center relative">
                <div className="absolute top-4 right-4 flex gap-1 bg-muted/50 p-1 rounded-lg z-10">
                  <button onClick={() => setTimeframe('6months')} className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${timeframe === '6months' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>6M</button>
                  <button onClick={() => setTimeframe('year')} className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${timeframe === 'year' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>YTD</button>
                  <button onClick={() => setTimeframe('all')} className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${timeframe === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>ALL</button>
                </div>
                
                <ResponsiveContainer width="100%" height={140} className="mt-4">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={green} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" hide />
                    <Tooltip 
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--foreground)" }} 
                      itemStyle={{ color: "var(--foreground)" }} 
                      labelStyle={{ color: "var(--muted-foreground)" }} 
                      formatter={(v: number) => [`${formatCurrency(v)}`, "Net Worth"]} 
                    />
                    <Area type="monotone" dataKey="savings" stroke={green} strokeWidth={2} fill="url(#savingsGrad)" dot={false} activeDot={{ r: 4, fill: green, stroke: "var(--card)", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
            </div>
          </div>
        </section>


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
                <DialogTrigger asChild><Button size="sm" className="rounded-full h-7 px-3 gap-1 text-xs ml-1"><Plus className="h-3 w-3" /> Add Month</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Month</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Month</Label>
                      <Select value={newMonthName} onValueChange={setNewMonthName}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTH_NAMES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
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
                <motion.div key={`${month.id}-${startIdx}`} initial={{ x: direction * 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut", delay: i * 0.06 }} whileHover={{ scale: 1.025, y: -3 }} whileTap={{ scale: 0.975 }} className="cursor-pointer" onClick={() => navigate(`/transactions/${month.id}`)}>
                  <div className="bg-card rounded-2xl border border-border shadow-sm hover:border-primary/40 p-5 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                      <div><p className="text-xs text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>{month.year}</p><h3 className="text-lg font-semibold mt-0.5">{month.month}</h3></div>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Rolling Total</span>
                      <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)", color: pos ? green : red }}>{formatCurrency(combinedCurrentBalance)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Accounts Snapshot (Design Fix Applied!) */}
        <section>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4" style={{ fontFamily: "var(--font-mono)" }}>Accounts Balance Snapshot</p>
          
          {accounts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm bg-card border border-dashed border-border rounded-2xl">
              No active accounts found.
            </div>
          ) : (
            // 👈 The outer wrapper is gone! We now use a clean, floating responsive grid.
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {accounts.map((acc) => {
                const balance = getAccountAllTimeBalance(acc.id);
                const latestTx = getAccountLatestTransaction(acc.id);
                return (
                  <div key={acc.id} className="flex flex-col justify-between bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-semibold leading-tight">{acc.name}</p>
                        {latestTx ? (
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                            Last: {latestTx.label} <span style={{ color: latestTx.type === 'income' ? green : red }} className="font-medium">({latestTx.type === 'income' ? '+' : '−'}{formatCurrency(latestTx.amount)})</span>
                          </p>
                        ) : <p className="text-xs text-muted-foreground mt-1 italic">No transactions</p>}
                      </div>
                    </div>
                    <div className="border-t border-border pt-3 mt-1 flex justify-between items-end">
                      <span className="text-xs text-muted-foreground">Total Balance</span>
                      <p className="text-lg font-bold tabular-nums" style={{ fontFamily: "var(--font-mono)", color: balance >= 0 ? green : red }}>
                        {formatCurrency(balance)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}