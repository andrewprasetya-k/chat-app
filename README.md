# 💬 Real-Time Chat Application

A modern, full-stack messaging platform engineered for performance and real-time interaction. Built with **NestJS** for a robust backend and **Next.js 16** for a responsive frontend, powered by **Supabase** and **Socket.io**.

---

## ✨ Features

### 🚀 Core Experience

- **Secure Authentication:** 
  - JWT-based secure login and registration.
  - **Email Verification:** Ensures user account authenticity via verification links.
  - **Social Login:** Sign in seamlessly with Google OAuth.
  - **Forgot Password:** Secure password reset flow with email confirmation.
- **Rich Messaging:** Send text messages with support for replies and unsending messages.
- **Message History:** Persistent chat history with optimized loading.
- **Global Search:** Unified search bar to find people, groups, and specific messages instantly.

### ⚡ Real-Time Interactions

- **Instant Delivery:** WebSocket-powered messaging for zero-latency communication.
- **Live Status:**
  - **Online/Offline Indicators:** See when friends are active.
  - **Last Seen:** Accurate timestamps for offline users.
- **Typing Indicators:** Real-time visual feedback when someone is typing.
- **Read Receipts:** WhatsApp-style blue double-checks to know exactly when your message is read.

### 👥 Group & Room Management

- **Personal Chats:** Seamless 1-on-1 private messaging.
- **Group Chats:** Create groups, add/remove members, and manage admins.
- **Room Info:** Detailed sidebar drawer showing members, roles, and group settings.
- **Real-time Updates:** Group changes (name, icon, members) reflect instantly for all participants.

---

## 🛠️ Tech Stack

### **Backend (NestJS)**

- **Framework:** NestJS (Node.js)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Real-time Engine:** Socket.io
- **Auth:** Passport JWT strategy & Google OAuth
- **Architecture:** Modular Service-Repository pattern

### **Frontend (Next.js)**

- **Framework:** Next.js 16 (Pages Router)
- **Library:** React 19
- **Styling:** Tailwind CSS 4 + Lucide React Icons
- **State Management:** React Hooks & Context
- **API Client:** Axios (HTTP) & Socket.io-client (WebSocket)

---

## 📂 Project Structure

The project is structured as a monorepo containing both client and server applications:

```bash
chat-app/
├── backend/           # NestJS Server Application
│   ├── src/
│   │   ├── Auth/      # Authentication (JWT, Google, Forgot Password)
│   │   ├── Chat/      # Message Handling & Gateway
│   │   ├── ChatRoom/  # Room & Member Management
│   │   └── User/      # User Profile Logic
│   └── ...
│
├── frontend/          # Next.js Client Application
│   ├── src/
│   │   ├── components/ # Reusable UI Components
│   │   ├── pages/      # Application Routes (including Auth pages)
│   │   └── services/   # API Integration & Socket Logic
│   └── ...
```

---

## 🚦 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **pnpm**
- **Supabase Account** (for PostgreSQL database)

### 1. Clone the Repository

```bash
git clone https://github.com/andrewprasetya-k/chat-app.git
cd chat-app
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the root directory (or `backend/`) based on your Supabase and Auth credentials:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

FRONTEND_URL=http://localhost:3001
PORT=3000
```

Start the backend server:

```bash
npm run start:dev
```

### 3. Frontend Setup

Open a new terminal, navigate to the frontend directory, and install dependencies:

```bash
cd ../frontend
npm install
```

Configure the environment in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Start the frontend application:

```bash
npm run dev
```

_The application will be accessible at `http://localhost:3001`_

---

## 📚 Documentation

For deeper dive into the implementation details, check the internal documentation:

- **[API Reference](./backend/API_REFERENCE.md):** Comprehensive list of REST endpoints.
- **[WebSocket Architecture](./backend/WEBSOCKET_ARCHITECTURE.md):** Details on socket events.

---

## 👤 Author

**Andrew Prasetya**

- GitHub: [@andrewprasetya-k](https://github.com/andrewprasetya-k)

---

_Built with TypeScript._
