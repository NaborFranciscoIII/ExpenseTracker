import { BrowserRouter, Routes, Route } from 'react-router';

// Layout
import { AppLayout } from '@/app/components/layouts/app-layout';

// Pages
import { HomePage } from '@/app/components/home-page';
import { MonthDetailPage } from '@/app/components/month-detail-page'; 
import { HistoryPage } from '@/app/components/history-page';
import { TransactionsHub } from '@/app/components/transactions-hub';
import { AnalyticsPage } from '@/app/components/analytics-page';
import { SettingsPage } from '@/app/components/settings-page';

// Hardware Hook
import { useHardwareBack } from '@/app/hooks/use-hardware-back';
import { ExpenseProvider } from './app/contexts/expense-context';
import { SettingsProvider } from './app/contexts/settings-context';

function HardwareBackButtonHandler() {
  useHardwareBack();
  return null;
}
         
export function App() {
  return (
    <BrowserRouter>
      <HardwareBackButtonHandler />
      <SettingsProvider>
        <ExpenseProvider> 
            <Routes>
          {/* The AppLayout wraps all these routes */}
          <Route element={<AppLayout />}>
            
            {/* Main Dashboard */}
            <Route path="/" element={<HomePage />} />
            
            {/* Ledger & Transactions Routing */}
            <Route path="/transactions" element={<TransactionsHub />} />
            <Route path="/transactions/:monthId" element={<MonthDetailPage />} />
            <Route path="/transactions/:monthId/account/:accountId" element={<HistoryPage />} />
            
            {/* Insights & Configuration */}
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

          </Route>
        </Routes>
        </ExpenseProvider>
      </SettingsProvider>
      
    </BrowserRouter>
  );
}