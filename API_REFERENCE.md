# Backend API & WebSocket Reference
> **Status:** Updated for WhatsApp/Teams-like Features (Avatars, Read Receipts, Typing Indicators).

## 🌍 Base Configuration

- **Base URL:** `http://localhost:3000` (Local)
- **Authentication:** Bearer Token (JWT)
  - Header: `Authorization: Bearer <YOUR_TOKEN>`

---

## 📡 WebSocket (Real-time)

**Connection:**
- URL: `http://localhost:3000`
- Options: `{ auth: { token: "Bearer <YOUR_TOKEN>" } }`

### Client -> Server (Emit)

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `join_room` | `string` (roomId) | Wajib dipanggil saat user membuka layar chat room. |
| `leave_room` | `string` (roomId) | Dipanggil saat user keluar dari layar chat/pindah room. |
| `typing_start` | `string` (roomId) | Dipanggil saat user mulai mengetik. |
| `typing_stop` | `string` (roomId) | Dipanggil saat user berhenti mengetik/blur input. |

### Server -> Client (Listen)

| Event Name | Payload Structure | Description |
| :--- | :--- | :--- |
| `new_message` | `ChatMessageEntity` | Menerima pesan baru real-time. |
| `messages_read_update` | `{ roomId, readerId, messageIds[], readAt }` | Update centang biru real-time. |
| `user_typing` | `{ userId, roomId }` | Munculkan indikator "Si Budi is typing...". |
| `user_stopped_typing` | `{ userId, roomId }` | Hilangkan indikator typing. |
| `user_online` | `{ userId }` | Update status teman jadi "Online". |
| `user_offline` | `{ userId, lastSeenAt }` | Update status teman jadi "Offline" + waktu terakhir. |

---

## 🚀 REST API Endpoints

### 1. Authentication (`/auth`)

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| POST | `/auth/login` | `{ email, password }` | Login & get JWT Token. |
| POST | `/auth/register` | `{ email, password, fullName }` | Register new user. |

### 2. User & Profile (`/user`)

| Method | Endpoint | Body / Key | Description |
| :--- | :--- | :--- | :--- |
| GET | `/user/profile` | - | Get my profile info. |
| PATCH | `/user/profile` | `{ fullName, email }` | Update text profile. |
| POST | `/user/avatar` | Form-Data: `file` | **[NEW]** Upload Profile Picture. |
| GET | `/user/search/email/:email` | - | Cari user by email. |

### 3. Chat Rooms (`/room`)

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| GET | `/room/active` | - | List chat list (Inbox). |
| POST | `/room/create` | `{ groupName, groupMembers: [], isGroup: boolean }` | Buat room baru (Personal/Group). |
| POST | `/room/:roomId/icon` | Form-Data: `file` | **[NEW]** Upload Group Icon (Admin Only). |
| GET | `/room/:roomId` | - | Get Detail Room (Members, Info). |
| GET | `/room/messages/:roomId` | Query: `?limit=20&beforeAt=...` | Load history chat (Pagination). |
| POST | `/room/add-members/:roomId` | `{ members: ["uuid"] }` | Add member to group. |
| POST | `/room/leave/:roomId` | - | Leave group. |

### 4. Chat Actions (`/chat`)

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| POST | `/chat/send/:roomId` | `{ text, replyTo? }` | Kirim pesan teks. |
| POST | `/chat/read/:roomId` | `{ messageIds: ["uuid1", "uuid2"] }` | **[NEW]** Tandai pesan sudah dibaca (Trigger Centang Biru). |
| PATCH | `/chat/unsend/:roomId/:msgId` | - | Unsend pesan sendiri. |
| GET | `/chat/unread-count/:roomId` | - | Hitung badge unread message. |

---

## 💡 Implementation Tips for Frontend

### A. Read Receipts Logic (Centang Biru)
1. Gunakan `IntersectionObserver` pada list chat.
2. Saat bubble chat (milik orang lain) masuk viewport, masukkan ID-nya ke antrian (queue).
3. Debounce (tunggu) 500ms - 1s, lalu kirim ID-ID tersebut ke API `POST /chat/read/:roomId`.
4. Jangan kirim request satu per satu per pesan! Boros.

### B. Pagination Logic
1. Saat pertama load, panggil `GET /room/messages/:roomId?limit=20`.
2. Simpan `created_at` pesan paling atas (terlama) yang diterima.
3. Saat user scroll ke atas (mentok), panggil lagi API dengan `?beforeAt=TIMESTAMP_TADI`.
4. Gabungkan (prepend) data baru ke list chat yang ada di state.

### C. Avatar Handling
- User Avatar URL ada di field: `user.avatarUrl`.
- Group Icon URL ada di field: `room.groupIcon`.
- Selalu gunakan component `<Avatar />` yang punya fallback inisial nama jika URL null.
