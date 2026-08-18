# Touchee WebSocket API

## Connection

Both namespaces require JWT authentication via the socket handshake:

```javascript
const socket = io('http://localhost:3000/<namespace>', {
  auth: { token: 'Bearer <your_jwt_token>' },
  transports: ['websocket'],
});
```

## Namespace: /matching

### Client → Server events

| Event       | Payload                | Description                               |
| ----------- | ---------------------- | ----------------------------------------- |
| `heartbeat` | `{ moodCode: string }` | Refresh pool TTL every 30s to stay active |

### Server → Client events

| Event        | Payload                                                    | Description                            |
| ------------ | ---------------------------------------------------------- | -------------------------------------- |
| `matched`    | `{ matchId, chatId, partnerId, partnerUsername, moodTag }` | Fired when a match is found            |
| `matchEnded` | `{ matchId }`                                              | Fired when your partner ends the match |

## Namespace: /chat

### Client → Server events

| Event            | Payload                               | Description                          |
| ---------------- | ------------------------------------- | ------------------------------------ |
| `joinChat`       | `{ chatId }`                          | Join a chat room to receive messages |
| `leaveChat`      | `{ chatId }`                          | Leave a chat room                    |
| `sendMessage`    | `{ chatId, content }`                 | Send a message                       |
| `typing`         | `{ chatId, isTyping: boolean }`       | Broadcast typing indicator           |
| `markRead`       | `{ chatId, messageIds: string[] }`    | Mark messages as read                |
| `editMessage`    | `{ messageId, chatId, content }`      | Edit your own message                |
| `deleteMessage`  | `{ messageId, chatId }`               | Delete your own message              |
| `addReaction`    | `{ messageId, chatId, reactionType }` | Add a reaction                       |
| `removeReaction` | `{ messageId, chatId }`               | Remove your reaction                 |

### Server → Client events

| Event             | Payload                           | Description               |
| ----------------- | --------------------------------- | ------------------------- |
| `joinedChat`      | `{ chatId }`                      | Confirmed room join       |
| `newMessage`      | `Message object`                  | New message received      |
| `userTyping`      | `{ userId, chatId, isTyping }`    | Someone is/stopped typing |
| `messagesRead`    | `{ userId, messageIds, readAt }`  | Messages read by someone  |
| `messageEdited`   | `Message object`                  | A message was edited      |
| `messageDeleted`  | `{ id, status }`                  | A message was deleted     |
| `reactionAdded`   | `{ messageId, userId, reaction }` | Reaction added            |
| `reactionRemoved` | `{ messageId, userId }`           | Reaction removed          |
| `error`           | `{ message }`                     | Something went wrong      |
