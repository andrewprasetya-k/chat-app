# Chat Application (Still under development)

A full-stack real-time chat application with WhatsApp/Teams-like features built with NestJS (Backend) and Next.js (Frontend).

## 🚀 Features

### Backend (✅ Completed)
- **Authentication & Authorization**
  - JWT-based authentication
  - User registration and login
  - Protected routes with guards

- **Real-time Chat**
  - WebSocket connection using Socket.io
  - Instant message delivery
  - Typing indicators
  - Online/Offline status
  - Last seen timestamp

- **Chat Rooms**
  - Personal (1-on-1) and Group chat
  - Room member management
  - Group icon upload
  - Leave group functionality

- **Message Features**
  - Send text messages
  - Reply to messages
  - Unsend messages
  - Read receipts (Blue checkmarks)
  - Unread message count
  - Message pagination

- **User Profile**
  - Profile picture upload
  - Edit profile information
  - User search by email

### Frontend (🚧 In Progress)
- Basic Next.js setup with TypeScript
- Tailwind CSS configured
- Ready for development

## 🛠️ Tech Stack

### Backend
- **Framework:** NestJS
- **Database:** Supabase (PostgreSQL)
- **Real-time:** Socket.io
- **Authentication:** JWT + Passport
- **File Storage:** Supabase Storage
- **Validation:** class-validator & class-transformer
- **Password Hashing:** bcrypt

### Frontend
- **Framework:** Next.js 16 (Pages Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Library:** React 19

## 📦 Project Structure

```
chat-app/
├── backend/           # NestJS backend application
│   ├── src/
│   │   ├── Auth/      # Authentication module
│   │   ├── Chat/      # Chat & WebSocket gateway
│   │   ├── ChatRoom/  # Chat room management
│   │   ├── User/      # User profile & management
│   │   ├── Supabase/  # Supabase service
│   │   └── shared/    # Shared utilities & guards
│   ├── API_REFERENCE.md
│   └── WEBSOCKET_ARCHITECTURE.md
├── frontend/          # Next.js frontend application
│   ├── src/
│   │   ├── pages/     # Next.js pages
│   │   └── styles/    # Global styles
│   └── public/        # Static assets
└── README.md
```

## 🚦 Getting Started

### Prerequisites
- Node.js >= 18.x
- npm or pnpm
- Supabase account (for database & storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/andrewprasetya-k/chat-app.git
   cd chat-app
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies (if any)
   npm install

   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Setup Environment Variables**

   Create `.env` file in `/backend/` directory:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d

   # Server Configuration
   PORT=3000
   ```

4. **Run the applications**

   **Backend (Terminal 1):**
   ```bash
   cd backend
   npm run start:dev
   ```
   Backend will run on `http://localhost:3000`

   **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:3001` (or next available port)

## 📚 Documentation

### API Reference
Complete REST API documentation is available in [`backend/API_REFERENCE.md`](./backend/API_REFERENCE.md)

Key endpoints:
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /chat/send/:roomId` - Send message
- `POST /room/create` - Create new chat room
- `GET /room/active` - Get user's active chat rooms
- `POST /chat/read/:roomId` - Mark messages as read

### WebSocket Architecture
Detailed WebSocket implementation guide is in [`backend/WEBSOCKET_ARCHITECTURE.md`](./backend/WEBSOCKET_ARCHITECTURE.md)

Key events:
- `join_room` - Join a chat room
- `new_message` - Receive new message
- `typing_start/stop` - Typing indicators
- `user_online/offline` - User status updates
- `messages_read_update` - Read receipt updates

## 🔧 Development

### Backend Scripts
```bash
# Development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm run test

# Lint and fix
npm run lint
```

### Frontend Scripts
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

## 🎯 Roadmap

- [ ] Complete frontend UI/UX
- [ ] Implement chat interface
- [ ] WebSocket integration on frontend
- [ ] Message pagination UI
- [ ] File/Image sharing
- [ ] Voice messages
- [ ] Video calls
- [ ] Push notifications
- [ ] Mobile responsive design

## 📝 License

This project is private and unlicensed.

## 👤 Author

**Andrew Prasetya**
- GitHub: [@andrewprasetya-k](https://github.com/andrewprasetya-k)

---

**Note:** Backend is production-ready. Frontend is currently under development.
