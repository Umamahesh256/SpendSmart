# SpendSmart (FinTrack)

SpendSmart is a mobile-first group financial tracker designed to help friends, roommates, and teams manage shared expenses seamlessly. Built with React, Vite, Tailwind CSS, and Supabase.

## ✨ Features

- 📱 **Mobile-First Design**: Optimized for 375px+ screens with a premium glassmorphism UI.
- 💰 **Personal Finance**: Track your own income and expenses with smart insights.
- 👥 **Group Tracking**: Create rooms, invite friends via WhatsApp, and track shared bills.
- 👑 **Admin Control**: Manage group members, delete erroneous expenses, and see contribution breakdowns.
- 🔔 **Real-time Updates**: Instant feedback on transactions and group activities.
- 🛡️ **Secure Auth**: Powered by Supabase Auth with Role-Based Access Control.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Supabase Project

### Installation
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd FinTrack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Rename `.env.example` to `.env`
   - Fill in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

4. Run the development server:
   ```bash
   npm run dev
   ```

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Charts**: Recharts
- **Notifications**: react-hot-toast

## 📄 License
MIT
