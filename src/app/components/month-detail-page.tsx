import { useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useExpenses } from "../contexts/expense-context";
import { useTheme } from "../contexts/theme-context";
import { useCarousel } from "../hooks/use-carousel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, Moon, Sun, Plus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

const PIE_COLORS = ["#16a34a", "#2563eb", "#dc2626", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#ca8a04"];
const MONTHS_LIST = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function fmt(n: number, currency: string = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtCurrency(n: number, currency: string = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}


function renderOutsideLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, name, value, percent, fill } = props;
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 6) * cos;
  const sy = cy + (outerRadius + 6) * sin;
  const mx = cx + (outerRadius + 26) * cos;
  const my = cy + (outerRadius + 26) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 18;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";
  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={ex} cy={ey} r={2.5} fill={fill} />
      <text x={ex + (cos >= 0 ? 5 : -5)} y={ey - 3} textAnchor={textAnchor} fontSize={11} fontWeight={500} fill="var(--foreground)" style={{ fontFamily: "var(--font-sans)" }}>
        {name.length > 12 ? name.slice(0, 12) + "…" : name}
      </text>
      <text x={ex + (cos >= 0 ? 5 : -5)} y={ey + 10} textAnchor={textAnchor} fontSize={10} fill="var(--muted-foreground)" style={{ fontFamily: "var(--font-mono)" }}>
        ₱{value.toFixed(0)}
      </text>
    </g>
  );
}

export function MonthDetailPage() {
  const { monthId } = useParams<{ monthId: string }>();
  const navigate = useNavigate();
  const { months, accounts, getAccountTransactions, getAccountMonthTotals, addAccount, renameAccount, removeAccount } = useExpenses();
  const { theme, toggleTheme } = useTheme();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");

  const month = months.find((m) => m.id === monthId);
  const green = theme === "light" ? "#16a34a" : "#22c55e";
  const red = "#dc2626";

  // Pie chart: net savings (income − expenses) per savings account, positive only
  const pieData = useMemo(() => {
    if (!monthId) return [];
    return accounts
      .map((acc) => {
        const { savings } = getAccountMonthTotals(acc.id, monthId);
        return { name: acc.name, value: savings };
      })
      .filter((d) => d.value > 0);
  }, [accounts, getAccountMonthTotals, monthId]);

  const today = new Date();
  const monthIndex = month ? MONTHS_LIST.indexOf(month.month) : -1;
  const isCurrentMonth = !!(month && today.getFullYear() === month.year && today.getMonth() === monthIndex);
  const firstDayOfWeek = month ? new Date(month.year, monthIndex, 1).getDay() : 0;
  const daysInMonth = month ? new Date(month.year, monthIndex + 1, 0).getDate() : 30;

  const datesWithTransactions = useMemo(() => {
    if (!monthId) return new Set<number>();
    const days = new Set<number>();
    accounts.forEach((acc) => {
      getAccountTransactions(acc.id, monthId).forEach((tx) => {
        days.add(parseInt(tx.date.split("-")[2], 10));
      });
    });
    return days;
  }, [accounts, getAccountTransactions, monthId]);

  const handleRenameStart = useCallback((id: string, name: string) => {
    setRenamingId(id);
    setRenameValue(name);
  }, []);

  const handleRenameConfirm = useCallback(() => {
    if (renamingId && renameValue.trim()) renameAccount(renamingId, renameValue.trim());
    setRenamingId(null);
  }, [renamingId, renameValue, renameAccount]);

  const ACCOUNT_LIMIT = 3;
  const accCarousel = useCarousel(accounts, ACCOUNT_LIMIT, true);

  const handleAddAccount = () => {
    if (newAccountName.trim()) {
      addAccount(newAccountName.trim());
      setNewAccountName("");
      setAddDialogOpen(false);
    }
  };

  if (!month) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Month not found.</p>
          <Button onClick={() => navigate("/")}>Go back</Button>
        </div>
      </div>
    );
  }

  const calendarCells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{month.year}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{month.month}</h1>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full h-9 w-9">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>

        {/* Section 1: Pie Chart */}
        <section className="mb-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4" style={{ fontFamily: "var(--font-mono)" }}>Expense Distribution</p>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            {pieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No accounts with positive net savings this month.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={renderOutsideLabel}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--foreground)",
                    }}
                    formatter={(v: number) => [fmtCurrency(v, "PHP"), "Net Savings"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Section 2: Savings Accounts */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>Savings Accounts</p>
            <div className="flex items-center gap-1.5">
              {accCarousel.total > ACCOUNT_LIMIT && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={accCarousel.goPrev} disabled={!accCarousel.canPrev}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums px-1" style={{ fontFamily: "var(--font-mono)" }}>
                    {accCarousel.startIdx + 1}–{Math.min(accCarousel.startIdx + ACCOUNT_LIMIT, accCarousel.total)} / {accCarousel.total}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={accCarousel.goNext} disabled={!accCarousel.canNext}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-full h-7 px-3 gap-1 text-xs ml-1">
                    <Plus className="h-3 w-3" />
                    Add Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Savings Account</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Input
                      placeholder="Account name"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
                      autoFocus
                    />
                    <Button onClick={handleAddAccount} className="w-full">Create Account</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accCarousel.visible.map((acc, i) => {
              const { income, expenses, savings } = getAccountMonthTotals(acc.id, monthId!);
              const pos = savings >= 0;
              const isRenaming = renamingId === acc.id;

              return (
                <motion.div
                  key={`${acc.id}-${accCarousel.startIdx}`}
                  initial={{ x: accCarousel.direction * 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut", delay: i * 0.06 }}
                  whileHover={isRenaming ? {} : { scale: 1.015, y: -2 }}
                >
                  <div
                    className="bg-card rounded-2xl border border-border shadow-sm hover:border-primary/40 hover:shadow-md transition-all p-5 cursor-pointer"
                    onClick={() => !isRenaming && navigate(`/month/${monthId}/account/${acc.id}`)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      {isRenaming ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameConfirm();
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            className="h-7 text-sm px-2"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={handleRenameConfirm}>
                            <Check className="h-3.5 w-3.5" style={{ color: green }} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => setRenamingId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold truncate">{acc.name}</p>
                      )}

                      {!isRenaming && (
                        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRenameStart(acc.id, acc.name)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeAccount(acc.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Income</span>
                        <span className="text-xs tabular-nums" style={{ fontFamily: "var(--font-mono)", color: green }}>+{fmt(income)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Expenses</span>
                        <span className="text-xs tabular-nums" style={{ fontFamily: "var(--font-mono)", color: red }}>−{fmt(expenses)}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-border">
                        <span className="text-xs text-muted-foreground">Net</span>
                        <span className="text-xs font-semibold tabular-nums" style={{ fontFamily: "var(--font-mono)", color: pos ? green : red }}>
                          {pos ? "+" : "−"}{fmt(Math.abs(savings))}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Calendar */}
        <section>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4" style={{ fontFamily: "var(--font-mono)" }}>
            Calendar · {month.month} {month.year}
          </p>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="grid grid-cols-7 mb-2">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground py-1" style={{ fontFamily: "var(--font-mono)" }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} />;
                const hasTx = datesWithTransactions.has(day);
                const isToday = isCurrentMonth && today.getDate() === day;
                return (
                  <div
                    key={day}
                    className="aspect-square flex flex-col items-center justify-center rounded-lg relative"
                    style={{
                      background: isToday
                        ? green
                        : hasTx
                        ? (theme === "light" ? "#dcfce7" : "#172417")
                        : "transparent",
                    }}
                  >
                    <span
                      className="text-xs font-medium leading-none"
                      style={{ fontFamily: "var(--font-mono)", color: isToday ? "#fff" : "var(--foreground)" }}
                    >
                      {day}
                    </span>
                    {hasTx && !isToday && (
                      <div className="w-1 h-1 rounded-full mt-1" style={{ background: green }} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: green }} />
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: theme === "light" ? "#dcfce7" : "#172417" }} />
                <span className="text-xs text-muted-foreground">Has transactions</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
