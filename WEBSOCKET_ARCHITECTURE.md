# Dokumentasi Arsitektur WebSocket & Real-time Gateway

Dokumen ini menjelaskan logika, alur kerja, dan implementasi fitur Real-time (WebSocket) pada aplikasi Chat ini menggunakan **NestJS Gateway** dan **Socket.io**.

---

## 1. Konsep Dasar: HTTP vs WebSocket

Sebelum masuk ke teknis, penting untuk memahami perbedaan dua jalur komunikasi yang kita gunakan di aplikasi ini:

### A. HTTP (REST API) - "Jalur Utama"
*   **Sifat:** *Request-Response* (Client minta, Server jawab, lalu putus).
*   **Kegunaan di App ini:** Login, Load History Chat, Create Room, dan **Mengirim Pesan**.
*   **Kenapa Kirim Pesan pakai HTTP?** Agar reliable (pasti tersimpan di DB), mendukung file upload, dan mudah divalidasi.

### B. WebSocket - "Jalur Cepat"
*   **Sifat:** *Full Duplex* (Koneksi terus terbuka, Server bisa kirim data ke Client kapan saja tanpa diminta).
*   **Kegunaan di App ini:** Notifikasi pesan baru (`new_message`), indikator mengetik (`typing`), status online.
*   **Kenapa tidak simpan pesan via WebSocket?** WebSocket tidak menjamin *acknowledgement* sebaik HTTP. Jika koneksi putus kedip, pesan bisa hilang.

---

## 2. Arsitektur & Alur Data

Aplikasi ini menggunakan pola **Hybrid**: Simpan via HTTP, Broadcast via WebSocket.

### Skenario 1: Mengirim Pesan (Flow Pesan Masuk)

1.  **User A** mengetik pesan dan tekan "Send".
2.  **Frontend A** memanggil API `POST /chat/send/:roomId` (HTTP).
3.  **Backend (Controller -> Service):**
    *   Validasi input.
    *   Simpan pesan ke **Supabase** (Database).
    *   Jika sukses simpan, Service memanggil **ChatGateway**.
4.  **Backend (Gateway):** Mem-broadcast event `new_message` ke semua orang di `room_123`.
5.  **Frontend B (Lawan Bicara):** Menerima event `new_message` -> Munculkan Bubble Chat.

### Skenario 2: Typing Indicator (Flow Ringan)

1.  **User A** mulai mengetik.
2.  **Frontend A** mengirim sinyal via WebSocket: `socket.emit('typing_start', { roomId: '123' })`.
3.  **Backend (Gateway):** Menerima sinyal, lalu meneruskan (*forward*) ke member lain di room itu.
    *   *Note: Sinyal ini TIDAK disimpan ke Database. Hanya lewat saja.*
4.  **Frontend B:** Menerima event `user_typing` -> Tampilkan "User A is typing...".

---

## 3. Struktur Code Backend

### A. `ChatGateway` (`src/Chat/Gateway/chat.gateway.ts`)
Ini adalah "Traffic Controller" untuk WebSocket.

1.  **`handleConnection(client: Socket)`**
    *   *Trigger:* Otomatis saat user connect.
    *   *Sintaks Penting:*
        *   `client.handshake.auth.token`: Mengambil token yang dikirim client saat inisialisasi koneksi.
        *   `client.data.userId = ...`: Menyimpan data sesi custom di memori socket. Data ini akan nempel terus selama user terkoneksi, berguna agar kita tidak perlu decode token berulang-ulang di setiap request.
    *   *Fungsi:* **Satpam Pintu Masuk**. Memvalidasi JWT Token.

2.  **`handleDisconnect(client: Socket)`**
    *   *Trigger:* Otomatis saat koneksi terputus.
    *   *Fungsi:* Cleanup & Logging.

3.  **`handleJoinRoom`**
    *   *Decorator:* `@SubscribeMessage('join_room')` -> Memberitahu NestJS untuk menjalankan fungsi ini hanya jika ada event bernama 'join_room'.
    *   *Decorator:* `@MessageBody()` -> Mengambil isi data (payload) yang dikirim client.
    *   *Decorator:* `@ConnectedSocket()` -> Mengambil object `client` milik pengirim spesifik untuk dimanipulasi.
    *   *Sintaks:* `client.join('room_xyz')`. Method bawaan Socket.io untuk memasukkan user ke dalam grup broadcast (channel).
    *   *Fungsi:* Mendaftarkan user ke saluran spesifik.

4.  **`handleLeaveRoom`**
    *   *Sintaks:* `client.leave('room_xyz')`. Kebalikan dari join, user tidak akan mendengar apa-apa lagi dari room ini.
    *   *Fungsi:* Stop langganan notifikasi room.

5.  **`handleTypingStart` & `handleTypingStop`**
    *   *Sintaks:* `client.to(roomId).emit(...)`
        *   `.to(roomId)`: Targetkan ke room tertentu.
        *   **PENTING:** Menggunakan `client.to(...)` (bukan `server.to(...)`) artinya pesan dikirim ke **semua orang di room itu KECUALI si pengirim sendiri**. Ini efisien karena pengirim tidak butuh notifikasi "Anda sedang mengetik".
    *   *Fungsi:* Broadcast sinyal typing ke lawan bicara.

### B. `ChatService` (`src/Chat/Service/chat.service.ts`)
Ini adalah "Otak Bisnis".
*   Dia yang menyimpan pesan ke Database.
*   Dia yang **men-trigger** Gateway untuk broadcast pesan.
*   Code: `this.chatGateway.server.to(room).emit('new_message', data)`

---

## 4. Kamus Event (Event Dictionary)

Berikut adalah daftar event yang harus di-handle oleh Frontend Developer.

### Client -> Server (Emit dari Frontend)

| Event Name | Payload (Data) | Deskripsi |
| :--- | :--- | :--- |
| `join_room` | `roomId` (string) | Wajib dipanggil saat user membuka halaman chat room. |
| `leave_room` | `roomId` (string) | Dipanggil saat user keluar dari halaman chat (back). |
| `typing_start` | `roomId` (string) | Dipanggil saat user mulai mengetik di input field. |
| `typing_stop` | `roomId` (string) | Dipanggil saat user berhenti mengetik / blur input. |

### Server -> Client (Listen di Frontend)

| Event Name | Payload (Data) | Deskripsi |
| :--- | :--- | :--- |
| `new_message` | `ChatMessageEntity` (Object Pesan Lengkap) | Ada pesan baru masuk. Tambahkan ke list chat paling bawah. |
| `user_typing` | `{ userId, roomId }` | User lain sedang mengetik. Tampilkan indikator. |
| `user_stopped_typing` | `{ userId, roomId }` | User berhenti mengetik. Sembunyikan indikator. |

---

## 5. Panduan Implementasi Frontend (React Example)

Gunakan library `socket.io-client`.

### A. Setup Koneksi (Global / Context)
```javascript
import { io } from "socket.io-client";

// Ambil token dari LocalStorage / State management
const token = "eyJhbGciOiJIUz..."; 

// Inisialisasi Socket
const socket = io("http://localhost:3000", {
  transportOptions: {
    polling: {
      extraHeaders: {
        Authorization: `Bearer ${token}`, // Kirim Token disini
      },
    },
  },
  auth: {
    token: `Bearer ${token}`, // Atau disini (tergantung versi client)
  }
});
```

### B. Masuk Room & Listen Event (Di Component ChatRoom)
```javascript
useEffect(() => {
  // 1. Join Room saat component mount
  socket.emit('join_room', roomId);

  // 2. Setup Listener: Pesan Baru
  socket.on('new_message', (newMessage) => {
    console.log("Pesan baru:", newMessage);
    // Logic: Tambahkan ke state messages
    setMessages((prev) => [newMessage, ...prev]); 
  });

  // 3. Setup Listener: Typing
  socket.on('user_typing', ({ userId }) => {
    if (userId !== myUserId) {
       setIsTyping(true);
    }
  });

  socket.on('user_stopped_typing', () => {
     setIsTyping(false);
  });

  // 4. Cleanup saat component unmount
  return () => {
    socket.emit('leave_room', roomId);
    socket.off('new_message');
    socket.off('user_typing');
    socket.off('user_stopped_typing');
  };
}, [roomId]);
```

### C. Handle Typing (Di Input Field)
```javascript
const handleInputChange = (e) => {
  setText(e.target.value);

  // Emit typing start
  socket.emit('typing_start', roomId);

  // Debounce untuk stop typing (misal user diam 2 detik)
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing_stop', roomId);
  }, 2000);
};
```
