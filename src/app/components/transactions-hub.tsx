import { useState } from "react";
import { useNavigate } from "react-router";
import { useExpenses } from "../contexts/expense-context";
import { useSettings } from "../contexts/settings-context";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Calendar, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function TransactionsHub() {
  const navigate = useNavigate();
  const { months, accounts, addMonth, getAccountMonthTotals } = useExpenses();
  const { formatCurrency } = useSettings();

  const [addMonthOpen, setAddMonthOpen] = useState(false);
  const [newMonthName, setNewMonthName] = useState("January");
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());

  const handleAddMonth = () => {
    addMonth(newMonthName, newMonthYear);
    setAddMonthOpen(false);
  };

  const alreadyExists = months.some((m) => m.month === newMonthName && m.year === newMonthYear);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Ledger History</p>
          <h1 className="text-2xl font-semibold tracking-tight">Monthly Records</h1>
        </div>

        <Dialog open={addMonthOpen} onOpenChange={setAddMonthOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-sm gap-2">
              <Plus className="h-4 w-4" /> Open New Month
            </Button>
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
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Year</Label>
                <Input type="number" value={newMonthYear} onChange={(e) => setNewMonthYear(parseInt(e.target.value, 10))} min={2000} max={2100} />
              </div>
              {alreadyExists && <p className="text-xs text-destructive">{newMonthName} {newMonthYear} already exists.</p>}
              <Button onClick={handleAddMonth} className="w-full" disabled={alreadyExists}>Create Ledger</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* The Full Grid of Months */}
      {months.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-2xl border-dashed">
          <Calendar className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">No records found</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Open a new month to start tracking your finances.</p>
          <Button onClick={() => setAddMonthOpen(true)} variant="outline" className="rounded-full">Create your first month</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* We reverse the array to show the newest months first */}
          {[...months].reverse().map((month, i) => {
            let combinedCurrentBalance = 0;
            accounts.forEach(acc => { combinedCurrentBalance += getAccountMonthTotals(acc.id, month.id).currentBalance; });
            const isPositive = combinedCurrentBalance >= 0;

            return (
              <motion.div 
                key={month.id} 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/transactions/${month.id}`)}
                className="cursor-pointer group"
              >
                <div className="bg-card rounded-2xl border border-border shadow-sm group-hover:shadow-md group-hover:border-primary/40 transition-all p-6 h-full flex flex-col justify-between relative overflow-hidden">
                  
                  {/* Decorative Background Element */}
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">{month.year}</p>
                      <h3 className="text-2xl font-bold mt-1 tracking-tight">{month.month}</h3>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-between items-end relative z-10">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Closing Balance</span>
                      <span className="text-lg font-semibold tabular-nums" style={{ color: isPositive ? "var(--primary)" : "var(--destructive)" }}>
                        {formatCurrency(combinedCurrentBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}