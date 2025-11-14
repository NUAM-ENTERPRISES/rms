# RNR (Ring Not Response) Frontend Implementation Guide

## 🎯 Overview

The RNR reminder system frontend integration allows recruiters to receive automated reminders when candidates haven't responded to calls. The system polls the backend (which uses BullMQ) and displays pop-up notifications when reminders are due.

---

## 📁 Files Created

### 1. **API Service** (`/src/services/rnrRemindersApi.ts`)
- API endpoints for fetching and dismissing RNR reminders
- RTK Query integration with baseApi
- TypeScript interfaces for RNR data structures

### 2. **Modal Component** (`/src/features/candidates/components/RNRReminderModal.tsx`)
- Pop-up modal that displays when reminder is due
- Shows candidate info, phone number, status history
- Action buttons: Call Now, View Profile, Dismiss

### 3. **Custom Hook** (`/src/features/candidates/hooks/useRNRReminders.ts`)
- Manages RNR reminder state and polling logic
- Polls API every 30 seconds for pending reminders
- Tracks which reminders have been shown to avoid duplicates

### 4. **Provider Component** (`/src/app/providers/rnr-reminder.provider.tsx`)
- Global provider that wraps the app
- Automatically displays modal when reminders are due
- Integrates with useRNRReminders hook

### 5. **Badge Indicator** (`/src/features/candidates/components/RNRReminderBadge.tsx`)
- Header notification bell for pending RNR reminders
- Shows count of pending reminders
- Popover with list of candidates needing follow-up
- Integrated into Header component

---

## 🔄 How It Works

### 1. Backend Sends Reminders (BullMQ)
```
BullMQ Job Processor (every hour)
    ↓
Finds due reminders (scheduledFor <= NOW)
    ↓
Processes each reminder:
  - Checks if candidate still in RNR status
  - Checks daily limit (max 2 per day)
  - Marks reminder as ready
    ↓
Frontend polls API and detects new reminder
```

### 2. Frontend Polling
```typescript
// useRNRReminders hook polls every 30 seconds
const { data } = useGetMyRNRRemindersQuery(undefined, {
  pollingInterval: 30000, // 30 seconds
  refetchOnFocus: true,
  refetchOnReconnect: true,
});
```

### 3. Modal Display Logic
```typescript
// Shows first pending reminder that hasn't been shown yet
useEffect(() => {
  const newReminder = pendingReminders.find(
    (r) => !shownReminderIds.has(r.id)
  );

  if (newReminder && !isModalOpen) {
    setCurrentReminder(newReminder);
    setIsModalOpen(true);
    setShownReminderIds((prev) => new Set([...prev, newReminder.id]));
  }
}, [pendingReminders]);
```

---

## 🎨 User Experience Flow

### Step 1: Recruiter Marks as RNR
1. Recruiter calls candidate, no answer
2. Updates status to "RNR" in candidate detail page
3. Backend creates reminder scheduled for 5 hours later

### Step 2: Reminder Becomes Due
1. BullMQ processes reminder after 5 hours
2. Reminder status changes to ready for display
3. Frontend polling detects new pending reminder

### Step 3: Modal Appears
```
┌─────────────────────────────────────┐
│  ⚠️  Follow-up Required             │
├─────────────────────────────────────┤
│  Candidate: John Doe                │
│  Status: RNR (5 hours ago)          │
│  Reminder: #1 of 2                  │
│  Phone: +91 9876543210              │
│                                     │
│  Previous Note: "Called but no      │
│  response"                          │
│                                     │
│  This candidate hasn't responded    │
│  to your previous call.             │
│                                     │
│  [Dismiss] [View Profile] [Call]    │
└─────────────────────────────────────┘
```

### Step 4: Recruiter Actions

**Option A: Call Now**
- Clicks "Call Now" button
- Phone dialer opens with number
- After call, recruiter updates status manually

**Option B: View Profile**
- Clicks "View Profile"
- Navigates to candidate detail page
- Can update status/add notes

**Option C: Dismiss**
- Clicks "Dismiss"
- API call: `DELETE /rnr-reminders/{id}/dismiss`
- Reminder cancelled (no more notifications)
- Modal closes

---

## 🔔 Badge Indicator

### Header Integration
The RNR badge appears in the header next to notifications:

```tsx
<div className="flex items-center space-x-1">
  <RNRReminderBadge />  {/* Shows pending count */}
  <NotificationBell />
  <UserMenu />
</div>
```

### Badge Features
- **Orange bell icon** with count badge
- **Popover on click** showing list of pending reminders
- **Quick navigation** - click candidate to view profile
- **Real-time updates** - polls every 30 seconds

---

## 🛠️ API Endpoints Used

### 1. Get My RNR Reminders
```typescript
GET /rnr-reminders/my-reminders

Response:
{
  "success": true,
  "data": [
    {
      "id": "reminder_123",
      "candidateId": "clx456",
      "candidate": {
        "id": "clx456",
        "firstName": "John",
        "lastName": "Doe",
        "countryCode": "+91",
        "mobileNumber": "9876543210",
        "currentStatus": {
          "id": 8,
          "statusName": "rnr"
        }
      },
      "scheduledFor": "2025-11-12T15:00:00.000Z",
      "status": "pending",
      "reminderCount": 1,
      "statusHistory": {
        "statusUpdatedAt": "2025-11-12T10:00:00.000Z",
        "reason": "Called but no response"
      }
    }
  ]
}
```

### 2. Dismiss Reminder
```typescript
DELETE /rnr-reminders/{reminderId}/dismiss

Response:
{
  "success": true,
  "message": "RNR reminder dismissed successfully"
}
```

---

## 🧪 Testing the System

### Test 1: Basic Flow
```bash
# 1. Mark candidate as RNR in UI
# Navigate to candidate detail page → Update status to "RNR"

# 2. Backend creates reminder (check in browser console)
# Should see API call to update status

# 3. Simulate time passing (backend)
# In backend database:
UPDATE rnr_reminders 
SET scheduled_for = NOW() 
WHERE candidate_id = 'your_candidate_id';

# 4. Wait 30 seconds (frontend polling interval)
# Modal should appear automatically

# 5. Test actions:
# - Click "Call Now" - should open phone dialer
# - Click "View Profile" - should navigate to candidate page
# - Click "Dismiss" - should close modal and cancel reminder
```

### Test 2: Multiple Reminders
```bash
# 1. Create multiple RNR candidates
# Mark 3 different candidates as RNR

# 2. Make all reminders due
# Update scheduled_for to NOW for all

# 3. Refresh page
# Should see badge with count "3"
# Modal shows first reminder
# After dismissing, next reminder appears

# 4. Check badge popover
# Click orange bell icon
# Should see list of all pending reminders
```

### Test 3: Badge Indicator
```bash
# 1. Create pending reminder
# 2. Look at header - should see orange bell with count
# 3. Click bell - popover shows candidate details
# 4. Click candidate in popover - navigates to profile
```

---

## ⚙️ Configuration

### Polling Interval
Change how often frontend checks for reminders:

```typescript
// In useRNRReminders.ts
const { data } = useGetMyRNRRemindersQuery(undefined, {
  pollingInterval: 30000, // Change this (milliseconds)
});

// Examples:
// 15000 = 15 seconds (more frequent)
// 60000 = 1 minute (less frequent)
```

### Modal Behavior
Customize modal display logic in `useRNRReminders.ts`:

```typescript
// Show only first reminder
const newReminder = pendingReminders[0];

// Or show all reminders sequentially
// (current implementation already does this)
```

---

## 🎯 Key Features

### ✅ Implemented
- [x] Automatic reminder polling (30-second intervals)
- [x] Pop-up modal with candidate details
- [x] Call Now button (opens phone dialer)
- [x] View Profile navigation
- [x] Dismiss functionality
- [x] Badge indicator in header
- [x] Popover with pending reminders list
- [x] Tracks shown reminders to avoid duplicates
- [x] Real-time count updates
- [x] Responsive design

### 🔮 Future Enhancements
- [ ] Sound notification when reminder appears
- [ ] Desktop notifications (browser API)
- [ ] Snooze functionality (delay reminder)
- [ ] Quick status update from modal
- [ ] Call history tracking
- [ ] Reminder analytics dashboard

---

## 🐛 Troubleshooting

### Problem: Modal doesn't appear
**Check:**
1. Is backend BullMQ processing reminders?
2. Is `scheduledFor` in the past?
3. Is reminder status `pending`?
4. Check browser console for API errors
5. Verify polling is working (Network tab)

**Solution:**
```typescript
// Enable debug logging
console.log("Pending reminders:", pendingReminders);
console.log("Shown IDs:", shownReminderIds);
```

### Problem: Badge not showing
**Check:**
1. Are there actually pending reminders?
2. Is API returning data correctly?
3. Check Header component includes RNRReminderBadge

**Solution:**
```bash
# Test API directly
curl -X GET http://localhost:3000/rnr-reminders/my-reminders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Problem: Call Now doesn't work
**Check:**
1. Phone number format correct?
2. Browser allows tel: protocol?
3. Check console for errors

**Solution:**
```typescript
// Test tel link
console.log(`tel:${countryCode}${mobileNumber}`);
// Should be like: tel:+919876543210
```

---

## 📱 Browser Compatibility

### Tested On:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

### Phone Dialer (`tel:` links):
- ✅ Works on mobile devices
- ✅ Works on desktop (if Skype/Teams installed)
- ⚠️ May prompt for app selection on desktop

---

## 🚀 Deployment Checklist

- [x] API endpoints configured correctly
- [x] Polling interval appropriate for production
- [x] Error boundaries in place
- [x] TypeScript types defined
- [x] Component tests written (optional)
- [x] Documentation complete
- [ ] Monitor polling performance
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure environment variables

---

## 📊 Performance Considerations

### Polling Strategy
```typescript
// Current: 30-second polling
// Impact: ~120 API calls per hour per user
// Acceptable for RNR system (not high volume)

// Alternative: WebSocket (future enhancement)
// Would eliminate polling overhead
```

### Memory Management
```typescript
// Tracks shown reminders to avoid duplicates
// Clears on unmount automatically
// No memory leaks from polling
```

---

## 🔐 Security

- API endpoints require authentication
- Only recruiter who marked RNR sees their reminders
- Dismiss action validates ownership
- No sensitive data in client-side storage

---

## 📞 Support

If you need help:
1. Check browser console for errors
2. Verify API responses in Network tab
3. Test backend endpoints directly
4. Review component mounting order

---

**Status:** ✅ Ready for Production  
**Last Updated:** November 12, 2025  
**Version:** 1.0.0
