# Notifications Feature

This feature provides real-time notifications for the Affiniks RMS application, following the FE_GUIDELINES.md architecture.

## Architecture

### Data Layer (`/data`)

- **`notifications.endpoints.ts`**: RTK Query endpoints using `baseApi.injectEndpoints()`
- **`dto.ts`**: Type definitions for server communication
- **`transforms.ts`**: Data transformation utilities

### Hooks (`/hooks`)

- **`useNotificationsList`**: Fetch paginated notifications
- **`useMarkNotificationRead`**: Mark notifications as read with optimistic updates
- **`useNotificationsBadge`**: Get unread count for badge display

### Components (`/components`)

- **`NotificationItem`**: Individual notification display with click handling
- **`NotificationsList`**: Virtualized list with loading/error states
- **`NotificationsBell`**: Header bell with popover and real-time updates

### Views (`/views`)

- **`NotificationsPage`**: Full notifications page with tabs (Unread/All)

## WebSocket Integration

The `NotificationsSocketProvider` handles real-time notifications:

### Connection

- Connects to WebSocket server using JWT token
- Automatically reconnects on token refresh
- Disconnects on logout

### Event Handling

- **`notification:new`**: Receives new notifications
- Shows toast via Sonner
- Optimistically updates RTK Query cache
- Increments badge count

### Cache Updates

- Badge count: Increments on new notifications
- Notifications list: Prepends new notifications
- Mark as read: Optimistic updates with rollback on failure

## API Contract

### REST Endpoints

- `GET /notifications?status=&limit=&cursor=` - List notifications
- `GET /notifications/badge` - Get unread count
- `PATCH /notifications/:id/read` - Mark as read

### WebSocket Events

- **`notification:new`** payload:
  ```typescript
  {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    meta?: Record<string, unknown>;
    createdAt: string;
  }
  ```

## Usage Examples

### Basic Notification Bell

```tsx
import { NotificationsBell } from "@/features/notifications";

// In header component
<NotificationsBell />;
```

### Notifications Page

```tsx
import { NotificationsPage } from "@/features/notifications";

// In router
<Route path="/notifications" element={<NotificationsPage />} />;
```

### Custom Hook Usage

```tsx
import {
  useNotificationsList,
  useMarkNotificationRead,
} from "@/features/notifications";

function MyComponent() {
  const { data, isLoading } = useNotificationsList({ status: "unread" });
  const { markAsRead } = useMarkNotificationRead();

  // Use data and markAsRead function
}
```

## Environment Variables

- `VITE_WS_URL`: WebSocket server URL (defaults to `http://localhost:3000`)
- `VITE_API_URL`: API base URL (defaults to `http://localhost:3000/api/v1`)

## Features

- ✅ Real-time notifications via WebSocket
- ✅ Optimistic updates with rollback
- ✅ Toast notifications for new items
- ✅ Badge count with unread indicator
- ✅ Pagination support
- ✅ Mark as read functionality
- ✅ Accessible UI components
- ✅ Error handling and loading states
- ✅ Follows FE_GUIDELINES.md architecture
- ✅ No direct fetch/axios calls (RTK Query only)
- ✅ Tailwind tokens only (no hardcoded colors)
- ✅ Strict TypeScript (no `any`)

## Dependencies

- `socket.io-client`: WebSocket client
- `@reduxjs/toolkit`: State management
- `sonner`: Toast notifications
- `date-fns`: Date formatting
- `lucide-react`: Icons
