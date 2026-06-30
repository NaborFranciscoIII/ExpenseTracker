import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/root-layout";
import { HomePage } from "./components/home-page";
import { MonthDetailPage } from "./components/month-detail-page";
import { HistoryPage } from "./components/history-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "month/:monthId", Component: MonthDetailPage },
      { path: "month/:monthId/account/:accountId", Component: HistoryPage },
    ],
  },
]);
