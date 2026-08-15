import { useState, useRef } from "react";
import { useSettings } from "../contexts/settings-context";
import { useExpenses } from "../contexts/expense-context";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertCircle, RefreshCw, Wallet, Download, Upload, CloudUpload, CloudDownload, Info } from "lucide-react";
import { loginToGoogle, pushToCloud, pullFromCloud } from "../services/google-drive";

const SUPPORTED_CURRENCIES = ["PHP", "USD", "EUR", "JPY", "GBP", "AUD", "CAD", "SGD"];

export function SettingsPage() {
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleDriveConnect = async () => {
    try {
      const token = await loginToGoogle();
      setDriveToken(token);
    } catch (err) {
      alert("Failed to connect to Google Drive.");
    }
  };

  const handleCloudPush = async () => {
    if (!driveToken) return;
    setIsSyncing(true);
    try {
      const backupData = JSON.stringify({
        local_months: localStorage.getItem('local_months'),
        local_accounts: localStorage.getItem('local_accounts'),
        local_transactions: localStorage.getItem('local_transactions'),
        local_categories: localStorage.getItem('local_categories'),
        local_budgets: localStorage.getItem('local_budgets'),
        local_recurring: localStorage.getItem('local_recurring'),
        app_currency: localStorage.getItem('app_currency'),
      });
      
      const success = await pushToCloud(driveToken, backupData);
      if (success) alert("Successfully backed up to Google Drive!");
      else throw new Error();
    } catch (err) {
      alert("Failed to push to cloud. Your token may have expired.");
      setDriveToken(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudPull = async () => {
    if (!driveToken) return;
    const confirm = window.confirm("WARNING: Pulling from the cloud will overwrite your current device data. Proceed?");
    if (!confirm) return;

    setIsSyncing(true);
    try {
      const jsonString = await pullFromCloud(driveToken);
      if (!jsonString) {
        alert("No backup file found in your Google Drive.");
        return;
      }

      const data = JSON.parse(jsonString);
      if (data.local_months) localStorage.setItem('local_months', data.local_months);
      if (data.local_accounts) localStorage.setItem('local_accounts', data.local_accounts);
      if (data.local_transactions) localStorage.setItem('local_transactions', data.local_transactions);
      if (data.local_categories) localStorage.setItem('local_categories', data.local_categories);
      if (data.local_budgets) localStorage.setItem('local_budgets', data.local_budgets);
      if (data.local_recurring) localStorage.setItem('local_recurring', data.local_recurring);
      if (data.app_currency) localStorage.setItem('app_currency', data.app_currency);
      
      alert("Cloud data restored successfully! The application will now reload.");
      window.location.reload();
    } catch (err) {
      alert("Failed to pull from cloud. The file might be corrupted.");
    } finally {
      setIsSyncing(false);
    }
  };

  const { currency, lastUpdated, changeCurrency, refreshRates } = useSettings();
  const { convertAllFinancialData } = useExpenses();
  
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [isConverting, setIsConverting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCurrencyChange = async () => {
    if (selectedCurrency === currency) return;
    const confirm = window.confirm(`WARNING: This will permanently recalculate all past transactions, budgets, and bills from ${currency} to ${selectedCurrency}. Do you wish to proceed?`);
    if (!confirm) return;

    setIsConverting(true);
    const success = await changeCurrency(selectedCurrency, convertAllFinancialData);
    setIsConverting(false);

    if (!success) {
      alert("Failed to convert currency. Please ensure you have an active internet connection to download the latest exchange rates.");
      setSelectedCurrency(currency);
    }
  };

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    const success = await refreshRates();
    setIsRefreshing(false);
    if (success) alert("Exchange rates successfully updated!");
    else alert("Failed to reach exchange server. You may be offline.");
  };

// 👇 PHASE 3: EXPORT BACKUP (Updated for Android Support)
  const handleExportBackup = async () => {
    const backupData = {
      local_months: localStorage.getItem('local_months'),
      local_accounts: localStorage.getItem('local_accounts'),
      local_transactions: localStorage.getItem('local_transactions'),
      local_categories: localStorage.getItem('local_categories'),
      local_budgets: localStorage.getItem('local_budgets'),
      local_recurring: localStorage.getItem('local_recurring'),
      app_currency: localStorage.getItem('app_currency'),
    };
    
    const jsonString = JSON.stringify(backupData, null, 2);
    const filename = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;

    try {
      // 1. Try the Native Android/iOS Share Sheet first
      const file = new File([jsonString], filename, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ 
          files: [file], 
          title: "Finance Backup Export",
          text: "Here is your local backup file for the Expense Tracker app."
        });
        return; // Stop here if native share succeeds
      }
    } catch (err) { 
      console.log("Share API failed or was cancelled by user", err); 
    }

    // 2. Fallback for Desktop Browsers (Windows/Mac)
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 👇 PHASE 3: IMPORT BACKUP
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirm = window.confirm("WARNING: Importing a backup will completely overwrite your current data. This cannot be undone. Proceed?");
    if (!confirm) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.local_months) localStorage.setItem('local_months', data.local_months);
        if (data.local_accounts) localStorage.setItem('local_accounts', data.local_accounts);
        if (data.local_transactions) localStorage.setItem('local_transactions', data.local_transactions);
        if (data.local_categories) localStorage.setItem('local_categories', data.local_categories);
        if (data.local_budgets) localStorage.setItem('local_budgets', data.local_budgets);
        if (data.local_recurring) localStorage.setItem('local_recurring', data.local_recurring);
        if (data.app_currency) localStorage.setItem('app_currency', data.app_currency);
        
        alert("Backup restored successfully! The application will now reload.");
        window.location.reload(); // Force full app reload to pull new local storage
      } catch (err) {
        alert("Invalid backup file. Please ensure it is a valid .json file generated by this application.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Configuration</p>
        <h1 className="text-2xl font-semibold tracking-tight">App Settings</h1>
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Global Currency Engine</h2>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1"><Wallet className="h-5 w-5" /></div>
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">Base Currency</label>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Changing your base currency will mathematically convert your entire historical database to match the new format based on today's live exchange rates.
              </p>
              <div className="flex gap-2">
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleCurrencyChange} disabled={selectedCurrency === currency || isConverting}>
                  {isConverting ? "Converting..." : "Apply Conversion"}
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-4 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              <span>Rates last synced: <span className="font-mono">{lastUpdated || "Never"}</span></span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefreshRates} disabled={isRefreshing} className="h-7 px-2">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} /> Sync Rates
            </Button>
          </div>
        </div>
      </section>

{/* PHASE 3: CLOUD SYNC & DATA SAFETY */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Cloud Sync & Data Backup</h2>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-5 text-sm">
            <div className="flex gap-2 items-start mb-2 text-primary">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="font-semibold">Manual Sync Guide (Multi-Device)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 ml-1 text-muted-foreground text-xs leading-relaxed">
              <li><strong>Push to Cloud:</strong> When you finish logging on this device, push your database to your secure Google Drive folder.</li>
              <li><strong>Pull from Cloud:</strong> Before logging expenses on a new device, pull your latest cloud file to sync your progress.</li>
            </ol>
            <p className="mt-3 text-[11px] font-medium text-destructive uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Always Pull before making new changes!
            </p>
          </div>

          <div className="divide-y divide-border">
            {!driveToken ? (
              <div className="py-4 flex justify-center">
                <Button onClick={handleDriveConnect} className="w-full sm:w-auto gap-2">
                  <CloudUpload className="h-4 w-4" /> Connect Google Drive
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-4">
                  <div>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500">Drive Connected</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Your secure AppData tunnel is active.</p>
                  </div>
                  <Button onClick={() => setDriveToken(null)} variant="ghost" size="sm" className="text-destructive h-8 px-2">
                    Disconnect
                  </Button>
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-medium">Push to Cloud</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Securely upload local data to Drive.</p>
                  </div>
                  <Button onClick={handleCloudPush} disabled={isSyncing} variant="outline" size="sm" className="gap-2 shadow-sm border-primary/30 hover:bg-primary/10">
                    <CloudUpload className="h-4 w-4"/> {isSyncing ? "Syncing..." : "Push"}
                  </Button>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <div>
                    <p className="text-sm font-medium">Pull from Cloud</p>
                    <p className="text-xs text-muted-foreground mt-0.5 text-destructive">Overwrites current device data.</p>
                  </div>
                  <Button onClick={handleCloudPull} disabled={isSyncing} variant="outline" size="sm" className="gap-2 shadow-sm border-destructive/30 hover:bg-destructive/10">
                    <CloudDownload className="h-4 w-4"/> {isSyncing ? "Syncing..." : "Pull"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}