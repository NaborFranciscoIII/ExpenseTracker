import { UpdateModal } from "../update-modal";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Home, ListOrdered, PieChart, Settings, Plus, Wallet, Calendar, ReceiptText, Check, X, Target } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { motion, AnimatePresence } from "motion/react";
import { useExpenses } from "../../contexts/expense-context";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Speed Dial & Global Modal States
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'month' | 'account' | 'record' | null>(null);

  // Global Expense Context for immediate saving
  const { months, accounts, categories, addMonth, addAccount, addTransaction, addCategory } = useExpenses();

  // Add Month State
  const [newMonthName, setNewMonthName] = useState("January");
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());

  // Add Account State
  const [newAccountName, setNewAccountName] = useState("");

  // Add Record State
  const [txMonthId, setTxMonthId] = useState("");
  const [txAccountId, setTxAccountId] = useState("");
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txLabel, setTxLabel] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txCategory, setTxCategory] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Ledger", path: "/transactions", icon: ListOrdered },
    { name: "Goals", path: "/goals", icon: Target },
    { name: "Insights", path: "/analytics", icon: PieChart },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  // Global Submit Handlers
  const handleAddMonth = () => {
    addMonth(newMonthName, newMonthYear);
    setActiveModal(null);
  };

  const handleAddAccount = () => {
    if (newAccountName.trim()) addAccount(newAccountName.trim());
    setNewAccountName("");
    setActiveModal(null);
  };

  const handleAddRecord = async () => {
    const amt = parseFloat(txAmount);
    if (!txLabel.trim() || !txCategory || isNaN(amt) || amt <= 0 || !txDate || !txAccountId || !txMonthId) return;

    await addTransaction(txAccountId, txMonthId, {
      type: txType,
      amount: amt,
      date: txDate,
      label: txLabel.trim(),
      category: txCategory,
    });

    // Reset fields & close
    setTxLabel(""); setTxAmount(""); setTxCategory("");
    setActiveModal(null);
  };

  const triggerModal = (type: 'month' | 'account' | 'record') => {
    setIsFabOpen(false);
    setActiveModal(type);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 px-4 py-6">
        <div className="mb-8 px-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Personal Finance</p>
          <h2 className="text-xl font-bold tracking-tight mt-1">Wealth Tracker</h2>
        </div>
        
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button key={item.name} onClick={() => navigate(item.path)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${ isActive ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted hover:text-foreground" }`}>
                <item.icon className="h-4 w-4" />
                {item.name}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-y-auto pb-20 md:pb-0 hide-scrollbar" onClick={() => setIsFabOpen(false)}>
        <Outlet />
      </main>

      {/* MOBILE BOTTOM TAB BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border flex items-center justify-around px-2 pb-safe z-40 h-16 shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <button key={item.name} onClick={() => { setIsFabOpen(false); navigate(item.path); }} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${ isActive ? "text-primary" : "text-muted-foreground" }`}>
              <item.icon className={`h-5 w-5 ${isActive ? "fill-primary/20" : ""}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* GLOBAL IN-APP UPDATER */}
      <UpdateModal />
      {/* GLOBAL SPEED DIAL FAB */}
      <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isFabOpen && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }} className="flex flex-col gap-3 items-end mb-2 pr-1">
              <Button onClick={() => triggerModal('month')} variant="secondary" className="rounded-full shadow-lg gap-2 h-10 px-4">
                <span className="font-medium text-sm">Add Month</span>
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center"><Calendar className="h-3.5 w-3.5 text-primary"/></div>
              </Button>
              <Button onClick={() => triggerModal('account')} variant="secondary" className="rounded-full shadow-lg gap-2 h-10 px-4">
                <span className="font-medium text-sm">Add Account</span>
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center"><Wallet className="h-3.5 w-3.5 text-primary"/></div>
              </Button>
              <Button onClick={() => triggerModal('record')} variant="secondary" className="rounded-full shadow-lg gap-2 h-10 px-4">
                <span className="font-medium text-sm">Add Record</span>
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center"><ReceiptText className="h-3.5 w-3.5 text-primary"/></div>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <Button 
          size="icon" 
          className={`h-14 w-14 rounded-full shadow-2xl transition-all duration-300 ${isFabOpen ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground rotate-45' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
          onClick={() => setIsFabOpen(!isFabOpen)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* GLOBAL MODALS ENGINE */}
      
      {/* 1. Add Month Modal */}
      <Dialog open={activeModal === 'month'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open New Ledger Month</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Month</Label>
              <Select value={newMonthName} onValueChange={setNewMonthName}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTH_NAMES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs text-muted-foreground mb-1.5 block">Year</Label><Input type="number" value={newMonthYear} onChange={(e) => setNewMonthYear(parseInt(e.target.value, 10))} /></div>
            <Button onClick={handleAddMonth} className="w-full">Create Month</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Add Account Modal */}
      <Dialog open={activeModal === 'account'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Financial Account</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder="e.g. Checking, Savings, Cash" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddAccount()} autoFocus />
            <Button onClick={handleAddAccount} className="w-full">Save Account</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Add Record Modal */}
      <Dialog open={activeModal === 'record'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Quick Add Record</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Select value={txMonthId} onValueChange={setTxMonthId}>
                <SelectTrigger><SelectValue placeholder="Select Month" /></SelectTrigger>
                <SelectContent>{months.map(m => <SelectItem key={m.id} value={m.id}>{m.month} {m.year}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={txAccountId} onValueChange={setTxAccountId}>
                <SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["income", "expense"] as const).map((t) => (
                <button key={t} onClick={() => setTxType(t)} className="py-2 px-3 rounded-lg text-sm font-medium border transition-all capitalize" style={{ background: txType === t ? (t === "income" ? "#16a34a" : "#dc2626") : "var(--card)", color: txType === t ? "#fff" : "var(--muted-foreground)", borderColor: txType === t ? (t === "income" ? "#16a34a" : "#dc2626") : "var(--border)" }}>{t}</button>
              ))}
            </div>

            <div><Label className="text-xs text-muted-foreground mb-1 block">Label</Label><Input placeholder="e.g., Groceries, Salary" value={txLabel} onChange={(e) => setTxLabel(e.target.value)} /></div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
                {isCreatingCategory ? (
                  <div className="flex gap-1">
                    <Input placeholder="New..." value={customCategory} onChange={e => setCustomCategory(e.target.value)} autoFocus className="px-2" />
                    <Button type="button" size="icon" variant="ghost" onClick={() => { if (customCategory.trim()) { addCategory(customCategory); setTxCategory(customCategory.trim()); } setIsCreatingCategory(false); setCustomCategory(""); }}><Check className="h-4 w-4 text-green-600" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsCreatingCategory(false)}><X className="h-4 w-4 text-muted-foreground" /></Button>
                  </div>
                ) : (
                  <Select value={txCategory} onValueChange={(v) => { if (v === 'CREATE_NEW') setIsCreatingCategory(true); else setTxCategory(v); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      <div className="border-t border-border mt-1 pt-1"><SelectItem value="CREATE_NEW" className="text-primary font-medium"><Plus className="h-3 w-3 inline mr-1" /> Create new...</SelectItem></div>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div><Label className="text-xs text-muted-foreground mb-1 block">Amount</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} /></div>
            </div>

            <div><Label className="text-xs text-muted-foreground mb-1 block">Date</Label><Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} /></div>
            
            <Button onClick={handleAddRecord} className="w-full" disabled={!txMonthId || !txAccountId || !txLabel || !txCategory || !txAmount}>Save Record</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}