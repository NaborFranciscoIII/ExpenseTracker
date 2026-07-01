# 📊 Cross-Platform Personal Finance Expense Tracker

A high-performance, responsive, and fully offline-first personal finance application designed to track wealth accumulation, manage budget limits, and execute double-entry ledger transfers seamlessly across **Web**, **Android Mobile**, and **Windows Desktop** environments.

Built from a single, unified codebase to demonstrate advanced architectural engineering in state management, persistent local database sandboxing, and platform-native asset bundling.

---

## 🚀 Key Evolutionary Features (Upgraded version alpha 0.1.2)

### 1. 🏦 Rolling Balance & Carry-Over Architecture
* **The Upgrade:** Avoids typical math duplication bugs caused by injection of artificial "starting balance" transactions.
* **The Logic:** Built an automated historical ledger scanning engine. When a new month is opened, the system dynamically crawls all chronological transaction records *prior to the first day of that month*, calculating a precise visual **Carry-Over Baseline** automatically.

### 2. 🔀 Double-Entry Savings Account Transfers
* **The Upgrade:** Allows fluid restructuring of funds (e.g., shifting ₱10,000 from a primary Savings Account into a Home Allowance ledger) without altering global macroeconomic net worth.
* **The Logic:** Executes a background transaction split. A single user confirmation creates an explicit `expense` row under the source account and a simultaneous, linked `income` row inside the target account.

### 3. 💼 Accounts Ledger Snapshot Dashboard
* **The Upgrade:** Replaced the generic global transaction history on the homepage with an interactive real-time net-worth breakdown.
* **The Logic:** Each account card displays its exact real-time all-time balance alongside a dynamic look-up snippet displaying its single most recent transactional label, direction, and execution timestamp.

### 4. 💾 Persistent Offline Database Sandboxing
* **The Upgrade:** Bypasses volatile device RAM drops. The application remains fully functional with **zero internet or active server connections**.
* **The Logic:** Intercepts network promise drops and smoothly pipes state adjustments directly into sandboxed webview `localStorage` states. Data persists securely on physical hardware even through application process resets and device reboots.

---

## 🛠️ Tech Stack & Compilation Shells

* **Frontend Framework:** React 19 (TypeScript)
* **Build Utility & Bundler:** Vite
* **Styling & UI Primitives:** Tailwind CSS, Radix UI UI Components, Lucide Icons
* **Data Visualization:** Recharts (Interactive Area & Pie Charts)
* **Mobile Compilation Layer:** Capacitor JS (Targeting Android SDK / Gradle Systems)
* **Desktop Compilation Layer:** Tauri (Targeting Native Rust Windows Shells)

---

## ⚙️ How to Run & Build Natively

### Prerequisites
Ensure your local machine is equipped with **Node.js**, **Android Studio (with an active SDK platform profile)**, and the **Rust Up toolchain (Cargo Package Manager)**.

### 1. Web Preview Environment
```bash
# Clone the repository and install packages
pnpm install

# Launch the hot-reloading Vite server
npm run dev