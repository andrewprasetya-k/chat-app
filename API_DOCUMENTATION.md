# Chat App API Documentation

## Overview
Aplikasi chat backend telah direfactor dengan pemisahan tanggung jawab yang jelas:
- **Chat Module**: Menangani operasi messaging
- **Chat-Room Module**: Menangani manajemen room

## API Endpoints

### 🗨️ Chat Operations (`/chat`)
Operasi yang berkaitan dengan pengiriman dan pengelolaan pesan.

#### Send Message
```
POST /chat/send/:roomId
```
Mengirim pesan ke room tertentu.

#### Mark Message as Read
```
POST /chat/read/:roomId/:messageId
```
Menandai pesan sebagai sudah dibaca.

#### Get Unread Count
```
GET /chat/unread-count/:roomId
```
Mendapatkan jumlah pesan yang belum dibaca di room.

#### Unsend Message
```
PATCH /chat/unsend/:roomId/:messageId
```
Membatalkan pengiriman pesan (hanya pengirim yang bisa).

#### Search Messages
```
GET /chat/search/:roomId/:query
```
Mencari pesan dalam room berdasarkan kata kunci.

---

### 🏠 Room Operations (`/room`)
Operasi yang berkaitan dengan manajemen room chat.

#### Get All Rooms
```
GET /room/list
```
Mendapatkan daftar semua room yang diikuti user.

#### Get Room Messages
```
GET /room/:roomId/messages?beforeAt=&limit=
```
Mendapatkan pesan-pesan dalam room (dengan pagination).

#### Create Room
```
POST /room/create
```
Membuat room chat baru (personal atau group).

#### Leave Room
```
POST /room/:roomId/leave
```
Keluar dari room chat.

#### Add Members
```
POST /room/:roomId/add-members
```
Menambah member ke group chat (hanya admin).

#### Remove Members
```
POST /room/:roomId/remove-members
```
Menghapus member dari group chat (hanya admin).

#### Delete Room
```
DELETE /room/:roomId
```
Menghapus group chat (hanya admin).

#### Get Room Info
```
GET /room/:roomId/info
```
Mendapatkan informasi detail room dan member.

## Benefits of Refactoring

### ✅ Separation of Concerns
- **Chat Module**: Fokus pada messaging operations
- **Chat-Room Module**: Fokus pada room management
- **Shared Module**: Fungsi validasi yang digunakan bersama

### ✅ Reduced Code Duplication
- Shared service untuk validasi user, room, dan permission
- Eliminasi duplikasi logic bisnis

### ✅ Cleaner API Structure
- Endpoint yang lebih intuitif dan terorganisir
- Pemisahan yang jelas antara messaging vs room operations

### ✅ Better Maintainability
- Kode lebih modular dan mudah di-maintain
- Testing yang lebih focused per module
- Easier to extend dengan fitur baru

## Migration Guide

### Old Endpoints → New Endpoints

| Old Endpoint | New Endpoint | Module |
|-------------|-------------|---------|
| `GET /chat/get-room-chat` | `GET /room/list` | Room |
| `GET /chat/get-room-chat/:id` | `GET /room/:id/messages` | Room |
| `POST /chat/create-room` | `POST /room/create` | Room |
| `POST /chat/send/:id` | `POST /chat/send/:id` | Chat |
| `POST /chat/leave-room/:id` | `POST /room/:id/leave` | Room |
| `POST /chat/add-member/:id` | `POST /room/:id/add-members` | Room |
| `POST /chat/remove-member/:id` | `POST /room/:id/remove-members` | Room |
| `DELETE /chat/delete-room/:id` | `DELETE /room/:id` | Room |
| `GET /chat/:id` | `GET /room/:id/info` | Room |

### Breaking Changes
- Semua room management operations dipindah dari `/chat` ke `/room`
- Parameter dan response format tetap sama
- Authentication requirements tetap sama
