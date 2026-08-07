import { useState, useMemo } from "react";
import { useExpenses } from "../contexts/expense-context";
import { useSettings } from "../contexts/settings-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { PieChart as PieIcon, Target, TrendingDown, Lightbulb, Zap, LineChart } from "lucide-react";
import { motion } from "motion/react";

const PIE_COLORS = ["#16a34a", "#2563eb", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#ca8a04"];

export function AnalyticsPage() {
  const { months, getMonthCategoryBreakdown, getSpendingInsights, getForecast, getMonthTotals } = useExpenses();
  const { formatCurrency } = useSettings();

  const [selectedMonthId, setSelectedMonthId] = useState<string>(months.length > 0 ? months[months.length - 1].id : "");

  const categoryData = useMemo(() => {
    if (!selectedMonthId) return [];
    return getMonthCategoryBreakdown(selectedMonthId);
  }, [selectedMonthId, getMonthCategoryBreakdown]);

  const pieData = categoryData.map(d => ({ name: d.category, value: d.spent })).filter(d => d.value > 0);
  const barData = [...categoryData].sort((a, b) => b.spent - a.spent).slice(0, 5);

  // 👇 FIX: Use a fallback object matching the returned shape of getMonthTotals
  const { expenses: totalSpent } = selectedMonthId ? getMonthTotals(selectedMonthId) : { expenses: 0 };
  
  // Phase 4 Intelligence
  const insights = selectedMonthId ? getSpendingInsights(selectedMonthId) : [];
  const forecast = selectedMonthId ? getForecast(selectedMonthId) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
      
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Intelligence</p>
          <h1 className="text-2xl font-semibold tracking-tight">Spending Analytics</h1>
        </div>

        {months.length > 0 && (
          <div className="w-full sm:w-48">
            <Select value={selectedMonthId} onValueChange={setSelectedMonthId}>
              <SelectTrigger><SelectValue placeholder="Select Month" /></SelectTrigger>
              <SelectContent>
                {[...months].reverse().map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.month} {m.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {months.length === 0 || !selectedMonthId ? (
        <div className="py-20 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
          No data available. Please create a month and add transactions first.
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* PHASE 4: AI Insights & Forecasting Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <TrendingDown className="h-4 w-4" /> <span className="text-sm font-medium">Total Spent</span>
              </div>
              <p className="text-3xl font-bold tracking-tight text-destructive">{formatCurrency(totalSpent)}</p>
            </div>

            {/* Smart Insights Box */}
            <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl shadow-sm md:col-span-2 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Lightbulb className="h-5 w-5" /> <span className="text-sm font-bold uppercase tracking-wider">Smart Insights</span>
              </div>
              <ul className="space-y-2 relative z-10">
                {insights.map((insight, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="text-sm font-medium leading-relaxed">
                    • {insight}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {/* PHASE 4: Advanced Forecasting Matrix */}
          {forecast && forecast.dailyBurnRate > 0 && (
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
               <div className="flex items-center gap-2 mb-6">
                <LineChart className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">End-of-Month Forecast</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
                <div className="pt-4 sm:pt-0">
                  <p className="text-xs text-muted-foreground font-mono mb-1">Current Daily Burn</p>
                  <p className="text-xl font-bold tracking-tight text-destructive">{formatCurrency(forecast.dailyBurnRate)} <span className="text-xs font-normal text-muted-foreground">/ day</span></p>
                </div>
                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <p className="text-xs text-muted-foreground font-mono mb-1">Predicted Balance</p>
                  <p className="text-xl font-bold tracking-tight text-primary">{formatCurrency(forecast.predictedBalance)}</p>
                </div>
                <div className="pt-4 sm:pt-0 sm:pl-6">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    <p className="text-xs text-muted-foreground font-mono">Safe to Spend</p>
                  </div>
                  <p className="text-xl font-bold tracking-tight text-amber-500">{formatCurrency(forecast.safeToSpend)} <span className="text-xs font-normal text-muted-foreground">/ day</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Distribution & Budgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <PieIcon className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Distribution Breakdown</h2>
              </div>
              
              {pieData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">No expenses recorded for this month.</div>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-full md:w-1/2 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                          {pieData.map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }} 
                          itemStyle={{ color: "var(--foreground)" }}
                          formatter={(v: number) => formatCurrency(v)} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 space-y-3">
                    {barData.map((d, i) => (
                      <div key={d.category} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-muted-foreground">{d.category}</span>
                        </div>
                        <span className="font-mono font-medium">{formatCurrency(d.spent)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Category Budget Health</h2>
              </div>

              <div className="space-y-5 max-h-[250px] overflow-y-auto pr-2 hide-scrollbar">
                {categoryData.filter(d => d.limit > 0).length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No active budgets detected. Set limits in the Month view Actions menu.
                  </div>
                ) : (
                  categoryData.filter(d => d.limit > 0).map(d => {
                    const percent = Math.min((d.spent / d.limit) * 100, 100);
                    const isOver = d.spent > d.limit;
                    return (
                      <div key={d.category} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{d.category}</span>
                          <span className="font-mono text-xs text-muted-foreground">{formatCurrency(d.spent)} / {formatCurrency(d.limit)}</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: isOver ? "var(--destructive)" : "var(--primary)" }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}