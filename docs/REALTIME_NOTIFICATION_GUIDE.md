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
    ├── screening-handler.ts           # Logic for screening-related events
    └── agent-candidate-request-handler.ts  # Agent candidate request + role fill sync
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

## Offer letter uploaded (recruiter or interview coordinator)

When a recruiter or interview coordinator uploads an offer letter, the backend calls `OutboxService.publishOfferLetterUploaded`, which emits:

| Event | Recipients |
|-------|------------|
| `OfferLetterUploaded` | System Admin, Admin, Manager, Recruiter Manager, CEO, Director, Processing Manager, Interview Coordinator, Processing Executive, and the assigned recruiter (uploader excluded) |
| `DataSync` (`OfferLetterUploaded`) | All connected clients (global broadcast) |

**Bell notification**

- Type: `offer_letter_uploaded`
- Title: `Offer Letter Uploaded`
- Link: `/recruiter-docs/{projectId}/{candidateId}`

**RTK tags to invalidate**

| Tag | Refreshes |
|-----|-----------|
| `Interview` | Interview passed / send-for-processing lists |
| `ProcessingSummary` | Ready-for-processing lists |
| `Processing` | Processing workspace |
| `Candidate` | Candidate detail |
| `Document` | Offer letter cards and document lists |
| `RecruiterDocuments` | Recruiter docs nomination view |
| `DocumentVerification` | Verification views |
| `{ type: "Document", id: "offer-letter-requests-{candidateId}" }` | Pending upload request banners |

**Handlers**

- `notification-handlers/offer-letter-handler.ts` — handles `notification:new` with type `offer_letter_uploaded` and `data:sync` with type `OfferLetterUploaded`
- Also resolves `role_notification` / `recruiter_notification` when `meta.type` is `offer_letter_uploaded`

---

## Send for processing (interview coordinator)

When an interview coordinator marks a passed interview as **ready for processing**, the backend calls `OutboxService.publishCandidateReadyForProcessing`, which emits:

| Event | Recipients |
|-------|------------|
| `CandidateReadyForProcessing` | Outbox job ack only (leadership bell notifications are sent via `RoleNotification`) |
| `RoleNotification` | Manager, Recruiter Manager, Processing Manager, System Admin, Admin, System Administrator (interview coordinator excluded) |
| `RecruiterNotification` | Assigned recruiter for that nomination |
| `DataSync` (`ProcessingSummary`) | Connected clients (list refresh) |

**Leadership / recruiter bell notification**

- Title: `Sent to Ready for Processing`
- Type / `meta.type`: `candidate_ready_for_processing`
- Processing leadership link (Manager, Processing Manager, Admin): `/ready-for-processing?projectId={projectId}&search={candidateName}`
- Recruiter Manager + assigned recruiter link: `/candidates/{candidateId}`

If no offer letter exists, the recruiter may also receive a separate `offer_letter_upload_requested` notification.

**RTK tags to invalidate**

| Tag | Refreshes |
|-----|-----------|
| `ProcessingSummary` | Ready-for-processing / processing lists |
| `Processing` | Processing workspace |
| `Interview` | Interview passed lists |
| `Candidate` | Candidate detail |
| `RecruiterDocuments` | Recruiter docs for the nomination |

**Handler:** `notification-handlers/processing-handler.ts` (handles `candidate_ready_for_processing`, `candidate_sent_for_processing`, and resolves `role_notification` / `recruiter_notification` via `meta.type`).

---

## Agent candidate requests (example)

When a manager submits **Request Agent Candidates**, the backend emits `agent_candidate_request_created` to Agent Coordinators.

**RTK tags to invalidate:**

| Tag | Refreshes |
|-----|-----------|
| `{ type: "Project", id: "AGENT_REQUESTS" }` | Agents dashboard candidate-requests list + tile count |
| `{ type: "Project", id: "<projectId>" }` | Project detail |
| `{ type: "Project", id: "ROLE_FILL_<projectId>" }` | Role Fill Progress card (Agent Coordinator) |
| `{ type: "Project", id: "AGENT_REQUESTS_<projectId>" }` | Request history modal |

**Handler:** `notification-handlers/agent-candidate-request-handler.ts` (registered in `notifications-socket.provider.tsx`).

**Mutation:** `createAgentCandidateRequest` invalidates the same tags so the submitter’s UI updates immediately without waiting for the socket.

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
