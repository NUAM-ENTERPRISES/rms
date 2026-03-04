# Real-Time Notification & Data Sync Architecture

This document explains how real-time updates and notifications are handled in the RMS system using Socket.io and RTK Query.

## 📁 File Structure

The real-time logic is modularized to ensure scalability as the system grows:

```
web/src/app/providers/
├── notifications-socket.provider.tsx  # Core Socket connection & routing
└── notification-handlers/             # Specialized domain logic
    ├── types.ts                       # Shared interfaces & types
    ├── document-handler.ts            # Logic for document-related events
    └── screening-handler.ts           # Logic for screening-related events
```

---

## 🏗️ Architecture Overview

The system uses a **Push-to-Invalidate** pattern:

1.  **Backend Action**: A user performs an action (e.g., verifies a document).
2.  **Notification/Event**: The backend sends a Socket.io event to the relevant users.
3.  **Frontend Catch**: `NotificationsSocketProvider` receives the event.
4.  **Domain Handler**: The provider delegates the event to a specific handler (e.g., `document-handler.ts`).
5.  **Tag Invalidation**: The handler invalidates specific RTK Query **Tags**.
6.  **Real-Time Update**: RTK Query automatically re-fetches any active queries connected to those tags, updating the UI instantly.

---

## 🛠️ How to Add a New Real-Time Update

### 1. Define the Tag
Ensure the tag is registered in `web/src/app/api/baseApi.ts`:

```typescript
// baseApi.ts
export const baseApi = createApi({
  // ...
  tagTypes: ["MyNewFeature", ...],
});
```

### 2. Provide the Tag in your API
In your feature API, tell the query to listen for this tag:

```typescript
// feature/api.ts
getFeatureData: builder.query<Response, void>({
  query: () => "/feature-data",
  providesTags: ["MyNewFeature"], // This query will refresh when this tag is invalidated
}),
```

### 3. Handle the Socket Event
Create or update a handler in the `notification-handlers/` directory:

```typescript
// notification-handlers/my-feature-handler.ts
export const handleMyFeatureNotifications = ({ notification, dispatch, invalidateTags }) => {
  if (notification.type === "my_new_event") {
    // Invalidate the tag to trigger a UI refresh
    dispatch(invalidateTags([{ type: "MyNewFeature" }]));
    return true;
  }
  return false;
};
```

### 4. Register in the Provider
Import and call your handler in `notifications-socket.provider.tsx`:

```typescript
// notifications-socket.provider.tsx
socket.on("notification:new", (notification: any) => {
  const context = { notification, dispatch, invalidateTags };
  
  handleDocumentNotifications(context);
  handleMyFeatureNotifications(context); // Add yours here
});
```

---

## 📝 Best Practices

1.  **Don't Fetch manually**: Avoid calling `refetch()` manually. Use Tag invalidation; it's cleaner and handles multiple components automatically.
2.  **Granular Tags**: Instead of just `["Document"]`, use `[{ type: "Document", id: candidateId }]` to only refresh the specific data that changed.
3.  **Direct Socket Events**: For updates that don't need a persistent "Bell" notification, use `socket.on("direct_event")` instead of `notification:new`.

---

## 🚀 Troubleshooting

*   **UI not updating?** Check if the tag name in `providesTags` matches exactly with what you are invalidating in the handler.
*   **Multiple notifications?** Check the backend outbox service to ensure you aren't publishing two events for the same action.
*   **Socket not connecting?** Verify the `VITE_WS_URL` in your `.env` file points to the correct backend port (default 3000).
