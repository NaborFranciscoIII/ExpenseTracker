import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useExpenses } from "../contexts/expense-context";
import { useTheme } from "../contexts/theme-context";
import { useCarousel } from "../hooks/use-carousel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  ArrowLeft, Moon, Sun, Plus, Pencil, Trash2, Check, X, 
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, 
  Search, Download, Filter, SearchX, RotateCcw 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function fmt(n: number, currency: string = "PHP") {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

interface EditState { type: "income" | "expense"; amount: string; date: string; label: string; category: string; }

export function HistoryPage() {
  const { monthId, accountId } = useParams<{ monthId: string; accountId: string }>();
  const navigate = useNavigate();
  const { months, accounts, categories, getAccountTransactions, getAccountMonthTotals, addTransaction, updateTransaction, deleteTransaction } = useExpenses();
  const { theme, toggleTheme } = useTheme();

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ type: "expense", amount: "", date: "", label: "", category: "Other" });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTx, setNewTx] = useState<EditState>({ type: "expense", amount: "", date: "", label: "", category: "Other" });

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  // Soft-Delete / Undo States
  const [softDeletedId, setSoftDeletedId] = useState<string | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const month = months.find((m) => m.id === monthId);
  const account = accounts.find((a) => a.id === accountId);

  const green = theme === "light" ? "#16a34a" : "#22c55e";
  const red = "#dc2626";

  if (!month || !account) return null;

  const rawTransactions = getAccountTransactions(accountId!, monthId!);
  
  // Real-time Search & Filter Engine (Now hides soft-deleted items)
  const filteredTransactions = useMemo(() => {
    return rawTransactions.filter(tx => {
      if (tx.id === softDeletedId) return false; // Hide pending deletes
      const matchesSearch = tx.label.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "All" || tx.category === filterCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [rawTransactions, searchTerm, filterCategory, softDeletedId]);

  const TX_LIMIT = 6;
  const txCarousel = useCarousel(filteredTransactions, TX_LIMIT, false);
  
  const { carryOver, currentBalance } = getAccountMonthTotals(accountId!, monthId!);
  const isBalancePositive = currentBalance >= 0;

  // --- Soft Delete Logic ---
  const triggerDelete = (txId: string) => {
    // If there's already one waiting, commit it instantly before starting the next
    if (softDeletedId) deleteTransaction(accountId!, monthId!, softDeletedId);
    
    setSoftDeletedId(txId);
    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);

    // Auto-commit permanent delete after 5 seconds
    deleteTimeoutRef.current = setTimeout(() => {
      deleteTransaction(accountId!, monthId!, txId);
      setSoftDeletedId(null);
    }, 5000);
  };

  const undoDelete = () => {
    if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    setSoftDeletedId(null); // Restores it to the UI
  };
  // -------------------------

  const exportCSV = () => {
    const headers = ["Date", "Type", "Category", "Label", "Amount"];
    const rows = filteredTransactions.map(tx => `${tx.date},${tx.type},${tx.category || 'Other'},"${tx.label}",${tx.amount}`);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${account.name}_${month.month}_${month.year}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEdit = (tx: typeof rawTransactions[0]) => {
    setEditingId(tx.id);
    setEditState({ type: tx.type, amount: tx.amount.toString(), date: tx.date, label: tx.label, category: tx.category || "Other" });
  };

  const confirmEdit = () => {
    if (!editingId || !editState.label.trim() || !editState.amount || !editState.date) return;
    updateTransaction(accountId!, monthId!, editingId, { type: editState.type, amount: parseFloat(editState.amount), date: editState.date, label: editState.label.trim(), category: editState.category });
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newTx.label.trim() || !newTx.amount || !newTx.date) return;
    await addTransaction(accountId!, monthId!, { type: newTx.type as "income" | "expense", amount: parseFloat(newTx.amount), date: newTx.date, label: newTx.label.trim(), category: newTx.category });
    setNewTx({ type: "expense", amount: "", date: "", label: "", category: "Other" });
    setAddDialogOpen(false);
  };

  function addCategory(customCategoryInput: string) {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/month/${monthId}`)} className="rounded-full h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{month.month} {month.year}</p>
              <h1 className="text-xl font-semibold tracking-tight">{account.name}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={exportCSV} className="rounded-full h-9 w-9" title="Export CSV">
              <Download className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full h-9 w-9">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Rolling Balance Banner */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Current Account Balance</p>
            <h2 className="text-3xl font-bold tracking-tight font-mono mt-1" style={{ color: isBalancePositive ? green : red }}>{fmt(currentBalance)}</h2>
          </div>
          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60 flex sm:flex-col justify-between">
            <span className="text-xs text-muted-foreground font-mono">Carry Over Baseline:</span>
            <span className="text-sm font-semibold font-mono mt-0.5" style={{ color: carryOver >= 0 ? green : red }}>{carryOver >= 0 ? "+" : "−"}{fmt(Math.abs(carryOver))}</span>
          </div>
        </div>

        {/* Transaction Log & Filters */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px] h-9 text-sm"><Filter className="h-3 w-3 mr-2 text-muted-foreground"/><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Add Button */}
            <div className="hidden sm:block">
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="rounded-full h-9 px-4 gap-1 text-sm shadow-sm"><Plus className="h-4 w-4" /> Add Record</Button>
                </DialogTrigger>
                <DialogContent>
                  {/* Dialog content is identical to before */}
                  <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      {(["income", "expense"] as const).map((t) => (
                        <button key={t} onClick={() => setNewTx({ ...newTx, type: t })} className="py-2 px-3 rounded-lg text-sm font-medium border transition-all capitalize" style={{ background: newTx.type === t ? (t === "income" ? green : red) : "var(--card)", color: newTx.type === t ? "#fff" : "var(--muted-foreground)", borderColor: newTx.type === t ? (t === "income" ? green : red) : "var(--border)" }}>{t}</button>
                      ))}
                    </div>
                    <div><Label className="text-xs text-muted-foreground mb-1 block">Label</Label><Input placeholder="e.g., Rent, Salary" value={newTx.label} onChange={(e) => setNewTx({ ...newTx, label: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
                        {isCreatingCategory ? (
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Type new category..." 
                              value={customCategoryInput} 
                              onChange={e => setCustomCategoryInput(e.target.value)} 
                              autoFocus
                            />
                            <Button 
                              type="button"
                              size="sm" 
                              onClick={() => {
                                if (customCategoryInput.trim()) {
                                  addCategory(customCategoryInput);
                                  setNewTx({ ...newTx, category: customCategoryInput.trim() });
                                }
                                setIsCreatingCategory(false);
                                setCustomCategoryInput("");
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setIsCreatingCategory(false)}>
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <Select 
                            value={newTx.category} 
                            onValueChange={(v) => {
                              if (v === 'CREATE_NEW') setIsCreatingCategory(true);
                              else setNewTx({ ...newTx, category: v });
                            }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              <div className="border-t border-border mt-1 pt-1">
                                <SelectItem value="CREATE_NEW" className="text-primary font-medium">
                                  <Plus className="h-3 w-3 inline mr-1" /> Create new...
                                </SelectItem>
                              </div>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div><Label className="text-xs text-muted-foreground mb-1 block">Amount</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={newTx.amount} onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })} /></div>
                    </div>
                    <div><Label className="text-xs text-muted-foreground mb-1 block">Date</Label><Input type="date" value={newTx.date} onChange={(e) => setNewTx({ ...newTx, date: e.target.value })} /></div>
                    <Button onClick={handleAdd} className="w-full">Save Record</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Ledger List */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden min-h-[300px] flex flex-col">
            {filteredTransactions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                 <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <SearchX className="h-8 w-8 text-muted-foreground opacity-50" />
                 </div>
                 <p className="text-sm font-medium text-foreground">No records found</p>
                 <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or category filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {txCarousel.visible.map((tx, i) => {
                    const isEditing = editingId === tx.id;
                    const txPos = tx.type === "income";

                    if (isEditing) {
                      return (
                        <div key={`${tx.id}-edit`} className="p-4 bg-muted/30">
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <Input value={editState.label} onChange={(e) => setEditState({...editState, label: e.target.value})} className="h-8 text-sm" />
                            <Input type="number" value={editState.amount} onChange={(e) => setEditState({...editState, amount: e.target.value})} className="h-8 text-sm" />
                          </div>
                          <div className="flex gap-2 mb-2">
                            <Select value={editState.category} onValueChange={(v) => setEditState({...editState, category: v})}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger>
                              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input type="date" value={editState.date} onChange={(e) => setEditState({...editState, date: e.target.value})} className="h-8 text-sm flex-1" />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4 mr-1"/> Cancel</Button>
                            <Button size="sm" onClick={confirmEdit}><Check className="h-4 w-4 mr-1"/> Save</Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <motion.div 
                        key={tx.id} 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }} 
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="relative overflow-hidden group"
                      >
                        {/* The Red Swipe Background */}
                        <div className="absolute inset-0 bg-destructive flex items-center justify-end px-6">
                           <Trash2 className="text-white h-5 w-5" />
                        </div>
                        
                        {/* The Draggable Foreground Card */}
                        <motion.div 
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={{ left: 0.8, right: 0 }} // Allows pulling left, rigid on right
                          onDragEnd={(e, info) => {
                             if (info.offset.x < -80) triggerDelete(tx.id); // Trigger delete if pulled past 80px
                          }}
                          className="relative z-10 flex items-center justify-between px-5 py-3.5 bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: txPos ? (theme === "light" ? "#dcfce7" : "#172417") : (theme === "light" ? "#fee2e2" : "#2d1515") }}>
                              {txPos ? <ArrowUpRight className="h-4 w-4" style={{ color: green }} /> : <ArrowDownRight className="h-4 w-4" style={{ color: red }} />}
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-tight">{tx.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{tx.category || 'Other'} • <span style={{ fontFamily: "var(--font-mono)" }}>{tx.date}</span></p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold tabular-nums mr-1" style={{ fontFamily: "var(--font-mono)", color: txPos ? green : red }}>{txPos ? "+" : "−"}{fmt(tx.amount)}</p>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(tx)}><Pencil className="h-3 w-3" /></Button>
                            {/* Standard Click Delete for Desktop Users */}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hidden sm:flex" onClick={() => triggerDelete(tx.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
            
            {/* Pagination Controls */}
            {txCarousel.total > TX_LIMIT && (
               <div className="border-t border-border p-3 flex items-center justify-center gap-4 bg-muted/10 mt-auto">
                 <Button variant="outline" size="sm" onClick={txCarousel.goPrev} disabled={!txCarousel.canPrev}><ChevronLeft className="h-4 w-4 mr-1"/> Prev</Button>
                 <span className="text-xs text-muted-foreground font-mono">{txCarousel.startIdx + 1} – {Math.min(txCarousel.startIdx + TX_LIMIT, txCarousel.total)} of {txCarousel.total}</span>
                 <Button variant="outline" size="sm" onClick={txCarousel.goNext} disabled={!txCarousel.canNext}>Next <ChevronRight className="h-4 w-4 ml-1"/></Button>
               </div>
            )}
          </div>
        </section>
      </div>

      {/* Floating Action Button (FAB) for Mobile */}
      <div className="sm:hidden fixed bottom-6 right-6 z-40">
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Undo Delete Toast */}
      <AnimatePresence>
        {softDeletedId && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-6 left-1/2 bg-foreground text-background px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-6 z-50 min-w-[280px]"
          >
            <span className="text-sm font-medium">Transaction deleted</span>
            <button 
              onClick={undoDelete} 
              className="text-sm font-bold text-background bg-foreground border border-background/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-background/20 transition-colors"
            >
              <RotateCcw className="h-4 w-4"/> Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}