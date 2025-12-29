# WebSocket Events Documentation

## Overview
This document lists all WebSocket events used in the chat application.

---

## Client → Server Events

### 1. `join_room`
**Description:** Join a specific chat room to receive real-time updates.

**Payload:**
```typescript
roomId: string
```

**Response:**
```typescript
{
  event: 'joined_room',
  data: roomId
}
```

**Security:** Validates that the user is a member of the room before allowing join.

---

### 2. `leave_room`
**Description:** Leave a chat room.

**Payload:**
```typescript
roomId: string
```

**Response:**
```typescript
{
  event: 'left_room',
  data: roomId
}
```

---

### 3. `typing_start`
**Description:** Notify other members that user is typing.

**Payload:**
```typescript
roomId: string
```

**Broadcast:** Emits `user_typing` to other room members (not sender).

---

### 4. `typing_stop`
**Description:** Notify other members that user stopped typing.

**Payload:**
```typescript
roomId: string
```

**Broadcast:** Emits `user_stopped_typing` to other room members (not sender).

---

## Server → Client Events

### 1. `new_message`
**Description:** New message sent in a room.

**Payload:**
```typescript
{
  textId: string;
  text: string;
  createdAt: string;
  messageType: 'user' | 'system';
  sender: {
    senderId: string;
    senderName: string;
  } | null;
  replyTo: {
    id: string;
    text: string;
    senderName: string;
  } | null;
  roomName: string;
}
```

**Triggered by:**
- `sendMessage()`
- `sendSystemMessage()`

---

### 2. `messages_read_update`
**Description:** Messages marked as read by a user.

**Payload:**
```typescript
{
  roomId: string;
  readerId: string;
  messageIds: string[];
  readAt: string;
}
```

**Triggered by:** `markMessagesAsRead()`

---

### 3. `message_unsent`
**Description:** A message was unsent/deleted by sender.

**Payload:**
```typescript
{
  roomId: string;
  messageId: string;
  unsendText: string; // '[This message was unsent]'
  unsendBy: string; // userId
}
```

**Triggered by:** `unsendMessage()`

---

### 4. `member_left`
**Description:** A member left the chat room.

**Payload:**
```typescript
{
  roomId: string;
  userId: string;
  userName: string;
  leftAt: string;
}
```

**Triggered by:** `leaveRoom()`

---

### 5. `room_deleted`
**Description:** Chat room was deleted/archived.

**Payload:**
```typescript
{
  roomId: string;
  deletedAt: string;
  deletedBy: string; // userId
}
```

**Triggered by:** `deleteRoom()`

---

### 6. `member_role_changed`
**Description:** Member role was changed (promoted/demoted).

**Payload:**
```typescript
{
  roomId: string;
  userId: string;
  userName: string;
  newRole: 'admin' | 'member';
  changedBy: string;
  changedByName: string;
}
```

**Triggered by:**
- `promoteToAdminService()`
- `demoteFromAdminService()`

---

### 7. `user_typing`
**Description:** Another user started typing.

**Payload:**
```typescript
{
  userId: string;
  roomId: string;
}
```

**Triggered by:** Client emits `typing_start`

---

### 8. `user_stopped_typing`
**Description:** Another user stopped typing.

**Payload:**
```typescript
{
  userId: string;
  roomId: string;
}
```

**Triggered by:** Client emits `typing_stop`

---

### 9. `user_online`
**Description:** User connected/came online.

**Payload:**
```typescript
{
  userId: string;
}
```

**Triggered by:** User connects to WebSocket

---

### 10. `user_offline`
**Description:** User disconnected/went offline.

**Payload:**
```typescript
{
  userId: string;
  lastSeenAt: string;
}
```

**Triggered by:** User disconnects from WebSocket

---

## Room Naming Convention

All room-specific events use the format: `room_${roomId}`

Example:
- Room ID: `abc123` → Socket room: `room_abc123`

---

## Authentication

WebSocket connections require JWT authentication:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'Bearer your-jwt-token'
  }
});
```

Or via headers:
```typescript
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});
```

---

## Usage Example (Frontend)

```typescript
// Connect
const socket = io('http://localhost:3000', {
  auth: { token: `Bearer ${accessToken}` }
});

// Join room
socket.emit('join_room', roomId);

// Listen for new messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // Update UI
});

// Listen for message unsent
socket.on('message_unsent', (data) => {
  console.log('Message unsent:', data.messageId);
  // Update message text in UI
});

// Listen for member left
socket.on('member_left', (data) => {
  console.log(`${data.userName} left the room`);
});

// Listen for role changes
socket.on('member_role_changed', (data) => {
  console.log(`${data.userName} is now ${data.newRole}`);
});

// Listen for room deleted
socket.on('room_deleted', (data) => {
  console.log('Room deleted, redirecting...');
  // Redirect user or show notification
});

// Typing indicator
const sendTypingStart = () => {
  socket.emit('typing_start', roomId);
};

const sendTypingStop = () => {
  socket.emit('typing_stop', roomId);
};

// Clean up
socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

---

## Security Notes

1. **Authentication Required:** All WebSocket connections must provide valid JWT token
2. **Room Access Control:** Users can only join rooms they are members of
3. **Message Ownership:** Users can only unsend their own messages
4. **Admin Actions:** Role changes are protected by admin guards in HTTP endpoints

---

## Best Practices

1. **Always join room** before expecting room-specific events
2. **Handle disconnects** gracefully with reconnection logic
3. **Clean up listeners** when component unmounts (React/Vue)
4. **Debounce typing events** to avoid flooding the server
5. **Show offline/online status** using user_online/user_offline events

---

## Future Enhancements

- [ ] File upload progress events
- [ ] Voice/video call signaling
- [ ] Delivery status (sent/delivered/read)
- [ ] Reactions to messages
- [ ] Message editing broadcast
- [ ] Bulk operations (e.g., mark all as read)
