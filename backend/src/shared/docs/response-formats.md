# API Response Formats

## Standardized Response Structure

All API responses use Entity format for consistency:

### User Response Format
```json
{
  "id": "uuid",
  "fullName": "string", 
  "email": "string",
  "role": "string",
  "createdAt": "ISO string",
  "updatedAt": "ISO string"
}
```

### Chat Message Response Format
```json
{
  "id": "uuid",
  "text": "string",
  "createdAt": "ISO string",
  "sender": {
    "id": "uuid",
    "fullName": "string"
  },
  "readReceipts": [
    {
      "readAt": "ISO string",
      "reader": {
        "id": "uuid", 
        "fullName": "string"
      }
    }
  ]
}
```

## DTO Usage

- **Request DTOs**: For input validation (LoginDto, RegisterDto, etc.)
- **Entity Classes**: For response transformation (UserEntity, ChatMessageEntity, etc.)
- **No more GetUserDto**: All responses use Entity format
