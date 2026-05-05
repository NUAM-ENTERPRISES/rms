# Processing Reminders System

This document outlines the unified architecture for handling reminders in the processing workflow (HRD, Data Flow, etc.).

## Architecture Overview

The system is built to be modular, real-time, and scalable. It replaces multiple fragmented reminder services with a single unified infrastructure.

- **Unified Queue**: All reminders are managed via a single BullMQ queue named `processing-reminders`.
- **Unified Processor**: A single `ProcessingStepProcessor` handles notification logic for all step types (HRD, Data Flow).
- **Real-time Notifications**: Uses Socket.IO (`NotificationsGateway`) to push reminders to users' browsers instantly.
- **Persistent Tracking**: A unified `ProcessingStepReminder` table tracks the state and counts for each reminder.
- **Dynamic Configuration**: Timing and availability are controlled via `SystemConfig` (e.g., HRD at 15 days, Data Flow at 30 days).

## Database Schema

The system uses a unified tracking model instead of step-specific tables:

```prisma
model ProcessingStepReminder {
  id                    String   @id @default(cuid())
  stepKey               String   // 'hrd' | 'data_flow' | etc.
  processingStepId      String
  processingCandidateId String
  assignedTo            String?  // Processing user to notify
  
  scheduledFor          DateTime 
  sentAt                DateTime?
  reminderCount         Int      @default(0)
  daysCompleted         Int      @default(0)
  status                String   @default("pending") // pending | sent | completed | cancelled
  
  // ... timestamps
}
```

## Components

### 1. `ProcessingRemindersService`
- **Location**: `backend/src/processing-reminders/processing-reminders.service.ts`
- **Responsibility**: Scheduling, rescheduling, and cancelling reminder jobs.
- **Key Method**: `scheduleReminder` creates/updates the `ProcessingStepReminder` record and queues a BullMQ job with exactly the calculated delay.

### 2. `ProcessingStepProcessor` (BullMQ)
- **Location**: `backend/src/jobs/processing-step.processor.ts`
- **Responsibility**: Processing the job when the timer expires.
- **Actions**:
  1. Verifies if the step is still active.
  2. Updates tracking stats in `ProcessingStepReminder`.
  3. Creates a persistent `Notification` record.
  4. Emits a `processing.reminder` event via Socket.IO.

### 3. `SystemConfig` Integration
- **Settings**: Defined in `SystemConfigService`.
- **Fields**: `daysAfterSubmission`, `dailyTimes`, `officeHours`, `testMode`.
- **Defaults**:
  - **HRD**: 15 days after submission.
  - **Data Flow**: 30 days after submission.

## Integration Flow

1. **Step Submission**: When a user updates a processing step's `submittedAt` date in `ProcessingService`, it calls `processingRemindersService.scheduleReminder()`.
2. **Scheduling**: The service calculates the delay (e.g., 15 days from submission) and adds a job to BullMQ with a unique ID `reminder:<stepId>`.
3. **Completion/Cancellation**: If a step is completed or cancelled, `cancelReminder()` is called to remove any pending jobs from the queue.
4. **Notification**: When the job runs, it sends a real-time event to the assigned user with a high-priority "Follow-up required" message.

## Real-time Event Specification

- **Channel**: `processing.reminder`
- **Payload**:
```json
{
  "type": "processing.reminder",
  "payload": {
    "notificationId": "uuid",
    "stepId": "uuid",
    "stepKey": "hrd",
    "candidateName": "John Doe",
    "projectName": "UK Hospital Project",
    "title": "HRD Follow-up required",
    "message": "HRD step for John Doe (UK Hospital Project) requires attention. Please follow up.",
    "route": "/processingCandidateDetails/uuid"
  }
}
```
