import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './app/contexts/auth-context';
import { ExpenseProvider } from './app/contexts/expense-context';
import { ThemeProvider } from './app/contexts/theme-context';
import '@/app/styles/index.css'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ExpenseProvider>
          <App />
        </ExpenseProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);