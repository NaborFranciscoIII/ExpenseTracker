import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.portfolio.expensetracker',
  appName: 'Expense Tracker',
  webDir: 'dist' //  Correct: Points directly to your root build folder
};

export default config;