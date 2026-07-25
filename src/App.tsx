import { BrowserRouter, Routes, Route } from 'react-router';
import { HomePage } from '@/app/components/home-page';             
import { MonthDetailPage } from '@/app/components/month-detail-page'; 
import { HistoryPage } from '@/app/components/history-page';
import { useHardwareBack } from '@/app/hooks/use-hardware-back';

// 1. Create a tiny invisible wrapper for our hardware hook
function HardwareBackButtonHandler() {
  useHardwareBack();
  return null;
}
         
export function App() {
  return (
    <BrowserRouter>
      {/* 2. Place it INSIDE the BrowserRouter so it has access to navigation */}
      <HardwareBackButtonHandler />
      
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/month/:monthId" element={<MonthDetailPage />} />
        <Route path="/month/:monthId/account/:accountId" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}