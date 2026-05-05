# Processing Reminders Architecture (Unified)

This document describes the unified architecture for handling reminders for processing steps (e.g., HRD, Data Flow, Verification).

## Overview

The system has been refactored from fragmented, step-specific reminder logic to a unified, event-driven architecture.

### Key Components

1.  **Unified Backend Service (`ProcessingRemindersService`):**
    *   Centralized logic for checking and creating actionable reminders for any processing step.
    *   Integrates with `SystemConfig` for configurable thresholds (e.g., HRD: 15 days, Data Flow: 30 days).

2.  **Unified Background Processor (`ProcessingReminderProcessor`):**
    *   A single BullMQ processor (`processing-reminders`) that handles all reminder-related jobs.
    *   Uses idempodency keys (`idemKey`) to prevent duplicate notifications.
    *   Emits real-time Socket.IO events (`processing.reminder`) upon job completion.

3.  **Unified Frontend API (`processingRemindersApi`):**
    *   A single RTK Query service providing the `@Get('reminders')` endpoint.
    *   Simplifies data fetching and provides a unified model for all reminder types.

4.  **Unified UI Component (`ProcessingRemindersBadge`):**
    *   A single notification tray in the header for all processing-related actions.
    *   Uses step-specific icons (e.g., `FileClock` for HRD, `ClipboardCheck` for Data Flow).
    *   Listens for `notifications:refresh` custom events for real-time updates.

## Flow

1.  **Job Trigger:** A `processing-reminders` job is added to the queue (manually or via `ProcessingService`).
2.  **Processing:** `ProcessingReminderProcessor` evaluates the step, checks `SystemConfig`, and queries the database for actionable items.
3.  **Persistence:** Actionable items are saved to the `notification` table with a unique `idemKey`.
4.  **Real-Time Broadcast:** The processor emits `processing.reminder` via `SocketService`.
5.  **Frontend Handling:** `processing-handler.ts` listens for the socket event and dispatches a `notifications:refresh` window event.
6.  **UI Refresh:** `ProcessingRemindersBadge` (and any other interested components) calls `refetch()` on the RTK Query hook to update the list.

## Configuration

Settings are stored in the `SystemConfig` table:
*   `HRD_REMINDER_DAYS`: Default 15
*   `DATA_FLOW_REMINDER_DAYS`: Default 30

## Legacy Cleanup

The following components have been removed:
*   `HRDReminderService`, `DataFlowReminderService`
*   `HRDReminderModule`, `DataFlowReminderModule`
*   `HRDReminderProvider`, `DataFlowReminderProvider`
*   `HRDReminderBadge`, `DataFlowBadge`
*   `hrdRemindersApi`, `dataFlowApi`
