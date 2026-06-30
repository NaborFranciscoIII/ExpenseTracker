import { BrowserRouter, Routes, Route } from 'react-router';
import { HomePage } from '@/app/components/home-page';             
import { MonthDetailPage } from '@/app/components/month-detail-page'; 
import { HistoryPage } from '@/app/components/history-page';         

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/month/:monthId" element={<MonthDetailPage />} />
        <Route path="/month/:monthId/account/:accountId" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}