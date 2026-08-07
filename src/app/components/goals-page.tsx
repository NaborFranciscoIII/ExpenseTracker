import { useState } from "react";
import { useExpenses } from "../contexts/expense-context";
import { useSettings } from "../contexts/settings-context";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Target, Plus, Trophy, TrendingUp, Trash2 } from "lucide-react";
import { motion } from "motion/react";

export function GoalsPage() {
  const { goals, addGoal, addMoneyToGoal, deleteGoal } = useExpenses();
  const { formatCurrency } = useSettings();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [fundDialogOpen, setFundDialogOpen] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [fundAmount, setFundAmount] = useState("");

  const handleCreateGoal = () => {
    const targetNum = parseFloat(target);
    if (name.trim() && !isNaN(targetNum) && targetNum > 0 && deadline) {
      addGoal({ name, targetAmount: targetNum, currentAmount: 0, deadlineDate: deadline });
      setName(""); setTarget(""); setDeadline("");
      setAddDialogOpen(false);
    }
  };

  const handleFundGoal = (id: string) => {
    const amt = parseFloat(fundAmount);
    if (!isNaN(amt) && amt > 0) {
      addMoneyToGoal(id, amt);
      setFundAmount("");
      setFundDialogOpen(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Future Planning</p>
          <h1 className="text-2xl font-semibold tracking-tight">Savings Goals</h1>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild><Button className="gap-2 rounded-full"><Plus className="h-4 w-4"/> New Goal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a Savings Target</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label className="mb-1 block">Goal Name</Label><Input placeholder="e.g. New Laptop" value={name} onChange={e => setName(e.target.value)} /></div>
              <div><Label className="mb-1 block">Target Amount</Label><Input type="number" placeholder="0.00" value={target} onChange={e => setTarget(e.target.value)} /></div>
              <div><Label className="mb-1 block">Target Date</Label><Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
              <Button onClick={handleCreateGoal} className="w-full">Start Saving</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border border-dashed rounded-2xl">
          <Trophy className="h-12 w-12 text-muted-foreground opacity-50 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No active goals</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Set a target to start tracking your dreams.</p>
          <Button onClick={() => setAddDialogOpen(true)} variant="outline">Create a Goal</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((g, i) => {
            const percent = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
            const isComplete = percent >= 100;

            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{g.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">By {g.deadlineDate}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteGoal(g.id)}><Trash2 className="h-4 w-4"/></Button>
                    </div>

                    <div className="flex justify-between items-end mb-2">
                      <span className="text-3xl font-bold tracking-tight text-primary">{formatCurrency(g.currentAmount)}</span>
                      <span className="text-sm text-muted-foreground mb-1">/ {formatCurrency(g.targetAmount)}</span>
                    </div>

                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-primary transition-all duration-1000 ease-out rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="text-xs text-right font-mono text-muted-foreground">{percent.toFixed(1)}%</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border">
                    {isComplete ? (
                      <div className="flex items-center justify-center gap-2 text-green-600 font-medium py-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                        <Trophy className="h-5 w-5" /> Goal Reached!
                      </div>
                    ) : (
                      <Dialog open={fundDialogOpen === g.id} onOpenChange={(open) => !open && setFundDialogOpen(null)}>
                        <DialogTrigger asChild><Button variant="outline" className="w-full gap-2" onClick={() => setFundDialogOpen(g.id)}><TrendingUp className="h-4 w-4"/> Add Funds</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Fund: {g.name}</DialogTitle></DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div><Label className="mb-1 block">Amount to Add</Label><Input type="number" placeholder="0.00" value={fundAmount} onChange={e => setFundAmount(e.target.value)} autoFocus /></div>
                            <Button onClick={() => handleFundGoal(g.id)} className="w-full">Deposit to Goal</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
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