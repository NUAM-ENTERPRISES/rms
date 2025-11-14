# RNR Reminder System - Frontend Implementation Guide

## Overview
This guide explains how to correctly implement the RNR (Ring Not Response) reminder system in the frontend to work with the backend API.

---

## Backend Behavior Summary

### When Status Changes to RNR (statusId = 8):
1. ✅ Backend creates ONE database entry in `rnr_reminders` table
2. ✅ Backend schedules the first reminder job (Testing: 1 min, Production: 4 hours)
3. ❌ Backend does NOT send an immediate notification
4. ✅ After delay, sends 1st reminder notification
5. ✅ After another delay, sends 2nd reminder notification
6. ✅ Stops (max 2 reminders per day reached)

### Key Points:
- **2 reminders per day maximum**
- **Same database record is updated** (not creating new entries)
- **No immediate notification** when status changes to RNR
- **Only shows popups after scheduled delays**

---

## API Endpoints

### 1. Get Active RNR Reminders
Get all active RNR reminders for the logged-in recruiter.

**Endpoint:**
```
GET /api/v1/rnr-reminders/my-reminders
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
[
  {
    "id": "cmhwzqg9q000wq4od6nv4f5un",
    "candidateId": "cmhuedu8l0001q4ji4uct7ohm",
    "recruiterId": "cmht2uusa00dnq4yj9eml628i",
    "statusHistoryId": "cmhwzqg9t000xq4odx77sc94r",
    "scheduledFor": "2025-11-13T05:31:48.000Z",
    "sentAt": "2025-11-13T05:32:48.123Z",
    "reminderCount": 2,
    "dailyCount": 2,
    "lastReminderDate": "2025-11-13T05:32:48.000Z",
    "status": "sent",
    "createdAt": "2025-11-13T05:30:48.000Z",
    "updatedAt": "2025-11-13T05:32:48.124Z",
    "candidate": {
      "id": "cmhuedu8l0001q4ji4uct7ohm",
      "firstName": "John",
      "lastName": "Doe",
      "countryCode": "+1",
      "mobileNumber": "1234567890",
      "currentStatus": {
        "id": 8,
        "statusName": "RNR"
      }
    },
    "statusHistory": {
      "statusUpdatedAt": "2025-11-13T05:30:48.000Z",
      "reason": "No response after multiple attempts"
    }
  }
]
```

### 2. Dismiss a Reminder
Manually dismiss a reminder (mark as handled).

**Endpoint:**
```
DELETE /api/v1/rnr-reminders/:reminderId/dismiss
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Reminder dismissed successfully"
}
```

---

## Frontend Implementation

### Step 1: Polling for Active Reminders

**Poll every 10 seconds** to check for active RNR reminders:

```typescript
// services/rnrReminderService.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface RNRReminder {
  id: string;
  candidateId: string;
  scheduledFor: string;
  sentAt: string | null;
  reminderCount: number;
  dailyCount: number;
  status: 'pending' | 'sent' | 'cancelled';
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    countryCode: string;
    mobileNumber: string;
    currentStatus: {
      id: number;
      statusName: string;
    };
  };
  statusHistory: {
    statusUpdatedAt: string;
    reason: string | null;
  };
}

export const rnrReminderService = {
  // Get all active reminders for logged-in recruiter
  async getMyReminders(token: string): Promise<RNRReminder[]> {
    const response = await axios.get(`${API_BASE_URL}/rnr-reminders/my-reminders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Dismiss a reminder
  async dismissReminder(reminderId: string, token: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/rnr-reminders/${reminderId}/dismiss`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
```

### Step 2: Create RNR Reminder Context/Hook

```typescript
// hooks/useRNRReminders.ts
import { useState, useEffect, useCallback } from 'react';
import { rnrReminderService, RNRReminder } from '@/services/rnrReminderService';
import { useAuth } from '@/contexts/AuthContext'; // Your auth context
import { toast } from 'react-toastify'; // Or your toast library

export const useRNRReminders = () => {
  const { token } = useAuth();
  const [reminders, setReminders] = useState<RNRReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [shownReminders, setShownReminders] = useState<Set<string>>(new Set());

  // Fetch reminders from API
  const fetchReminders = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const data = await rnrReminderService.getMyReminders(token);
      
      // Filter to only show 'sent' reminders that haven't been shown yet
      const newReminders = data.filter(
        (reminder) => 
          reminder.status === 'sent' && 
          !shownReminders.has(reminder.id)
      );

      // Show popup for new reminders
      newReminders.forEach((reminder) => {
        showReminderPopup(reminder);
        // Mark as shown
        setShownReminders((prev) => new Set(prev).add(reminder.id));
      });

      setReminders(data);
    } catch (error) {
      console.error('Failed to fetch RNR reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [token, shownReminders]);

  // Show popup notification
  const showReminderPopup = (reminder: RNRReminder) => {
    const candidateName = `${reminder.candidate.firstName} ${reminder.candidate.lastName}`;
    const message = `Follow-up Required: ${candidateName} is still in RNR (Ring Not Response). Please try calling again.`;

    toast.warning(message, {
      position: 'top-right',
      autoClose: false, // Don't auto-close
      closeOnClick: false,
      draggable: false,
      onClick: () => {
        // Navigate to candidate detail page
        window.location.href = `/candidates/${reminder.candidateId}`;
      },
    });
  };

  // Dismiss a reminder
  const dismissReminder = useCallback(async (reminderId: string) => {
    if (!token) return;

    try {
      await rnrReminderService.dismissReminder(reminderId, token);
      // Remove from local state
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      toast.success('Reminder dismissed');
    } catch (error) {
      console.error('Failed to dismiss reminder:', error);
      toast.error('Failed to dismiss reminder');
    }
  }, [token]);

  // Poll for reminders every 10 seconds
  useEffect(() => {
    if (!token) return;

    // Fetch immediately
    fetchReminders();

    // Set up polling interval
    const intervalId = setInterval(fetchReminders, 10000); // 10 seconds

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [fetchReminders, token]);

  return {
    reminders,
    loading,
    dismissReminder,
    refreshReminders: fetchReminders,
  };
};
```

### Step 3: Add to Your App Layout

```typescript
// components/RNRReminderProvider.tsx
'use client';

import { useRNRReminders } from '@/hooks/useRNRReminders';

export const RNRReminderProvider = ({ children }: { children: React.ReactNode }) => {
  // This will automatically poll and show popups
  useRNRReminders();

  return <>{children}</>;
};
```

```typescript
// app/layout.tsx or pages/_app.tsx
import { RNRReminderProvider } from '@/components/RNRReminderProvider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <RNRReminderProvider>
            {children}
          </RNRReminderProvider>
        </AuthProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
```

### Step 4: Optional - Show Active Reminders List

```typescript
// components/RNRRemindersList.tsx
'use client';

import { useRNRReminders } from '@/hooks/useRNRReminders';
import { formatDistanceToNow } from 'date-fns';

export const RNRRemindersList = () => {
  const { reminders, loading, dismissReminder } = useRNRReminders();

  if (loading) return <div>Loading reminders...</div>;

  if (reminders.length === 0) {
    return <div className="text-gray-500">No active RNR reminders</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Active RNR Reminders</h2>
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="border rounded-lg p-4 bg-yellow-50 hover:bg-yellow-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">
                {reminder.candidate.firstName} {reminder.candidate.lastName}
              </h3>
              <p className="text-sm text-gray-600">
                {reminder.candidate.countryCode} {reminder.candidate.mobileNumber}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Last reminded:{' '}
                {reminder.sentAt
                  ? formatDistanceToNow(new Date(reminder.sentAt), { addSuffix: true })
                  : 'Not sent yet'}
              </p>
              <p className="text-sm text-gray-500">
                Reminders today: {reminder.dailyCount} / 2
              </p>
              {reminder.statusHistory.reason && (
                <p className="text-sm text-gray-600 mt-2 italic">
                  Reason: {reminder.statusHistory.reason}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.href = `/candidates/${reminder.candidateId}`}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View Candidate
              </button>
              <button
                onClick={() => dismissReminder(reminder.id)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## Important: Remove Immediate Notifications

### ❌ DON'T DO THIS:

```typescript
// WRONG - Don't show notification immediately when status changes to RNR
const handleStatusChange = async (candidateId: string, statusId: number) => {
  await updateCandidateStatus(candidateId, statusId);
  
  // ❌ DON'T show popup here for RNR status
  if (statusId === 8) {
    toast.warning('Candidate marked as RNR'); // ❌ REMOVE THIS
  }
};
```

### ✅ DO THIS:

```typescript
// CORRECT - Let the backend handle reminders, only show success message
const handleStatusChange = async (candidateId: string, statusId: number) => {
  await updateCandidateStatus(candidateId, statusId);
  
  // ✅ Just show a success message
  toast.success('Status updated successfully');
  
  // ✅ If RNR, inform user that reminders will be sent
  if (statusId === 8) {
    toast.info('RNR reminders will be sent automatically after 4 hours');
  }
};
```

---

## Testing Configuration

### Current Backend Settings (for Testing):
- **Delay between reminders:** 1 minute
- **Max reminders per day:** 2
- **Total reminders:** 2 per day

### Timeline Example:
1. **10:00 AM** - Recruiter changes status to RNR
2. **10:01 AM** - First reminder popup appears (dailyCount: 1)
3. **10:02 AM** - Second reminder popup appears (dailyCount: 2)
4. **10:03 AM** - No more reminders (max 2 reached)

### Production Settings (After Testing):
To switch to production, update these lines in backend code:

**File:** `src/rnr-reminders/rnr-reminders.service.ts`
```typescript
// Comment out testing:
// scheduledFor.setMinutes(scheduledFor.getMinutes() + 1);
// const delayInMs = 60 * 1000;

// Uncomment production:
scheduledFor.setHours(scheduledFor.getHours() + 4);
const delayInMs = 4 * 60 * 60 * 1000;
```

**File:** `src/jobs/rnr-reminder.processor.ts`
```typescript
// Comment out testing:
// scheduledFor.setMinutes(scheduledFor.getMinutes() + 1);
// const delayInMs = 60 * 1000;

// Uncomment production:
scheduledFor.setHours(scheduledFor.getHours() + 4);
const delayInMs = 4 * 60 * 60 * 1000;
```

---

## Troubleshooting

### Issue: Seeing 3 popups instead of 2
**Cause:** Frontend showing immediate notification when status changes to RNR
**Solution:** Remove any code that shows notification immediately on status change

### Issue: Not seeing any popups
**Cause 1:** Polling not working
**Solution:** Check browser console for API errors

**Cause 2:** Toast notifications not configured
**Solution:** Ensure ToastContainer is added to your app

### Issue: Popups showing multiple times
**Cause:** Not tracking which reminders were already shown
**Solution:** Use the `shownReminders` Set in the hook to track displayed reminders

### Issue: Reminders not disappearing after status change
**Cause:** Backend cancels reminders when status changes from RNR, but frontend needs to refresh
**Solution:** Call `refreshReminders()` after updating candidate status

---

## Database Schema Reference

### RNRReminder Table Structure:
```sql
CREATE TABLE "rnr_reminders" (
  "id" TEXT PRIMARY KEY,
  "candidateId" TEXT NOT NULL,
  "recruiterId" TEXT NOT NULL,
  "statusHistoryId" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP NOT NULL,
  "sentAt" TIMESTAMP,
  "reminderCount" INTEGER DEFAULT 0,
  "dailyCount" INTEGER DEFAULT 0,
  "lastReminderDate" TIMESTAMP DEFAULT NOW(),
  "status" TEXT DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

### Key Points:
- **One entry per RNR status change**
- **Same entry is updated** when reminders are sent
- **dailyCount** tracks how many sent today (max 2)
- **reminderCount** tracks total reminders sent for this RNR instance
- **status** shows current state (pending/sent/cancelled)

---

## Additional Features (Optional)

### 1. Sound Notification
```typescript
const playNotificationSound = () => {
  const audio = new Audio('/sounds/notification.mp3');
  audio.play().catch(console.error);
};

// Add to showReminderPopup function
const showReminderPopup = (reminder: RNRReminder) => {
  playNotificationSound(); // Add sound
  // ... rest of the code
};
```

### 2. Browser Notification (with permission)
```typescript
const showBrowserNotification = (reminder: RNRReminder) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const candidateName = `${reminder.candidate.firstName} ${reminder.candidate.lastName}`;
    new Notification('RNR Reminder', {
      body: `Follow-up required for ${candidateName}`,
      icon: '/icons/notification-icon.png',
      tag: reminder.id, // Prevent duplicates
    });
  }
};

// Request permission on app load
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);
```

### 3. Snooze Reminder (Custom Extension)
If you want to add a snooze feature, you'd need to add a backend endpoint for it.

---

## Summary Checklist

- [ ] Install and configure toast notification library (react-toastify, sonner, etc.)
- [ ] Create `rnrReminderService.ts` with API calls
- [ ] Create `useRNRReminders.ts` hook with polling logic
- [ ] Add `RNRReminderProvider` to app layout
- [ ] Remove any immediate notifications on status change to RNR
- [ ] Test with 1-minute intervals (current backend config)
- [ ] Optional: Add `RNRRemindersList` component to dashboard
- [ ] After testing: Switch backend to 4-hour production intervals
- [ ] Optional: Add sound/browser notifications

---

## Support

For questions or issues, check:
1. Backend logs for reminder processing
2. Browser console for frontend errors
3. Network tab for API call responses
4. Database `rnr_reminders` table for reminder records

Backend files reference:
- `src/rnr-reminders/rnr-reminders.service.ts`
- `src/jobs/rnr-reminder.processor.ts`
- `src/rnr-reminders/rnr-reminders.controller.ts`
