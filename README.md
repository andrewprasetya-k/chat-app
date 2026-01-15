# 💬 Real-Time Chat Application

A modern, full-stack messaging platform engineered for performance and real-time interaction. Built with **NestJS** for a robust backend and **Next.js 16** for a responsive frontend, powered by **Supabase** and **Socket.io**.

---

## ✨ Features

### 🚀 Core Experience

- **Secure Authentication:** JWT-based secure login and registration system.
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
- **Auth:** Passport JWT strategy
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
│   │   ├── Auth/      # JWT Authentication & Guards
│   │   ├── Chat/      # Message Handling & Gateway
│   │   ├── ChatRoom/  # Room & Member Management
│   │   └── User/      # User Profile Logic
│   └── ...
│
├── frontend/          # Next.js Client Application
│   ├── src/
│   │   ├── components/ # Reusable UI Components (ChatWindow, Sidebar, etc.)
│   │   ├── pages/      # Application Routes
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

Create a `.env` file in `backend/` based on your Supabase credentials:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

PORT=3000
```

Start the backend server:

```bash
npm run start:dev
```

_The server will start on `http://localhost:3000`_

### 3. Frontend Setup

Open a new terminal, navigate to the frontend directory, and install dependencies:

```bash
cd ../frontend
npm install
```

Configure the environment in `frontend/.env.local` (optional, defaults are usually set in code):

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
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
- **[WebSocket Architecture](./backend/WEBSOCKET_ARCHITECTURE.md):** Details on socket events (`join_room`, `new_message`, `messages_read_update`) and payloads.
- **[WebSocket Events](./backend/WEBSOCKET_EVENTS.md):** Specific event definitions and trigger scenarios.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👤 Author

**Andrew Prasetya**

- GitHub: [@andrewprasetya-k](https://github.com/andrewprasetya-k)

---

_Built with TypeScript._
