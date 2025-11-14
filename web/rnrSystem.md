# RNR (Ring Not Response) Reminder System - Complete Guide

## 🎯 What Does This System Do?

When a recruiter calls a candidate and they don't answer, the recruiter marks the candidate as **RNR (Ring Not Response)**. This system automatically:
1. Waits **5 hours**
2. Sends a pop-up reminder to that recruiter
3. Repeats up to **2 times per day**
4. Stops if the candidate's status changes

---

## 📊 Database Structure

### New Table: `rnr_reminders`
```
Stores all RNR reminders for candidates

Fields:
- id: Unique reminder ID
- candidateId: Which candidate
- recruiterId: Which recruiter to remind
- statusHistoryId: Link to when status changed to RNR
- scheduledFor: When to send reminder (5 hours from RNR)
- sentAt: When reminder was actually sent
- reminderCount: 1st or 2nd reminder
- dailyCount: How many sent today
- status: 'pending', 'sent', or 'cancelled'
```

---

## 🔄 Complete Flow

### Step 1: Recruiter Marks Candidate as RNR
```
Recruiter → Calls candidate → No answer → Marks status as RNR (ID: 8)

API Call:
PUT /candidates/{candidateId}/status
{
  "currentStatusId": 8,
  "reason": "Called but no response"
}
```

### Step 2: System Creates Reminder
```
candidates.service.ts → updateStatus() 
    ↓
Creates CandidateStatusHistory record
    ↓
Calls rnrRemindersService.createRNRReminder()
    ↓
Creates RNRReminder record:
- candidateId: clx123
- recruiterId: user_456 (who marked as RNR)
- scheduledFor: NOW + 5 hours
- reminderCount: 1
- status: 'pending'
```

### Step 3: Cron Job Runs Every Hour
```
@Cron(CronExpression.EVERY_HOUR)
    ↓
Finds reminders where:
- status = 'pending'
- scheduledFor <= NOW
    ↓
For each reminder:
  1. Check: Is candidate still in RNR status?
     - NO → Cancel reminder
     - YES → Continue
  
  2. Check: Already sent 2 reminders today?
     - YES → Skip
     - NO → Continue
  
  3. Send notification to recruiter
  
  4. Update reminder status to 'sent'
  
  5. If < 2 reminders today:
     - Schedule next reminder (5 hours later)
```

### Step 4: Recruiter Sees Pop-up
```
Frontend polls notifications
    ↓
Receives notification type: 'RNR_REMINDER'
    ↓
Shows pop-up modal:
┌────────────────────────────────────┐
│  ⚠️  Follow-up Required            │
├────────────────────────────────────┤
│  Candidate: John Doe               │
│  Status: RNR (5 hours ago)         │
│  Phone: +91 9876543210             │
│                                    │
│  This candidate hasn't responded.  │
│  Please try calling again.         │
│                                    │
│  [Call Now]  [View]  [Dismiss]     │
└────────────────────────────────────┘
```

### Step 5: Recruiter Takes Action

**Option A: Call and Candidate Answers**
```
Recruiter → Changes status → Interested/Shortlisted
    ↓
System cancels all pending RNR reminders
```

**Option B: Call Again, Still No Answer**
```
Recruiter → Status stays RNR
    ↓
After 5 hours → 2nd reminder sent
    ↓
No more reminders (max 2 per day reached)
```

**Option C: Dismiss Reminder**
```
Recruiter clicks "Dismiss"
    ↓
DELETE /rnr-reminders/{reminderId}/dismiss
    ↓
Reminder cancelled (no more notifications)
```

---

## 📡 API Endpoints

### 1. Get My RNR Reminders
```http
GET /rnr-reminders/my-reminders
Authorization: Bearer <token>

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
  ],
  "message": "RNR reminders retrieved successfully"
}
```

### 2. Dismiss a Reminder
```http
DELETE /rnr-reminders/{reminderId}/dismiss
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "RNR reminder dismissed successfully"
}
```

### 3. Manually Trigger Processing (Admin Only)
```http
POST /rnr-reminders/process
Authorization: Bearer <token>
Permission: manage:system

Response:
{
  "success": true,
  "message": "RNR reminder processing triggered successfully"
}
```

---

## 🧪 How to Test

### Test 1: Basic RNR Flow
```bash
# Step 1: Mark candidate as RNR
curl -X PUT http://localhost:3000/candidates/{candidateId}/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentStatusId": 8,
    "reason": "Test RNR - no response on call"
  }'

# Step 2: Check reminder was created (look in database)
# In PostgreSQL:
SELECT * FROM rnr_reminders WHERE candidate_id = '{candidateId}';

# Step 3: Manually trigger processing (for testing, don't wait 5 hours)
# First update the scheduledFor to NOW:
UPDATE rnr_reminders SET scheduled_for = NOW() WHERE candidate_id = '{candidateId}';

# Then trigger processing:
curl -X POST http://localhost:3000/rnr-reminders/process \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Step 4: Check notification was created
curl -X GET http://localhost:3000/notifications \
  -H "Authorization: Bearer RECRUITER_TOKEN"

# Should see notification with type: 'RNR_REMINDER'
```

### Test 2: Status Change Cancels Reminders
```bash
# Step 1: Mark as RNR (creates reminder)
curl -X PUT http://localhost:3000/candidates/{candidateId}/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"currentStatusId": 8}'

# Step 2: Change to different status (should cancel reminder)
curl -X PUT http://localhost:3000/candidates/{candidateId}/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"currentStatusId": 2}'  # Interested

# Step 3: Check reminder was cancelled
SELECT * FROM rnr_reminders WHERE candidate_id = '{candidateId}';
# status should be 'cancelled'
```

### Test 3: Max 2 Reminders Per Day
```bash
# This tests the daily limit logic
# You'll need to manually update scheduledFor to simulate time passing

# After 1st reminder sent:
UPDATE rnr_reminders 
SET scheduled_for = NOW(), status = 'pending'
WHERE candidate_id = '{candidateId}';

# Trigger processing (sends 2nd reminder)
curl -X POST http://localhost:3000/rnr-reminders/process

# Try to create 3rd reminder (should not send)
# The system will see dailyCount = 2 and skip
```

---

## 🕐 Cron Schedule

The reminder processor runs **every hour**:
- 00:00 - Check and send due reminders
- 01:00 - Check and send due reminders
- 02:00 - Check and send due reminders
- ... and so on

To change the schedule, modify this line in `rnr-reminders.service.ts`:
```typescript
@Cron(CronExpression.EVERY_HOUR)  // Change to EVERY_30_MINUTES, etc.
```

---

## 🔍 Database Queries for Monitoring

### See all pending reminders
```sql
SELECT 
  r.id,
  c.first_name || ' ' || c.last_name as candidate_name,
  u.name as recruiter_name,
  r.scheduled_for,
  r.reminder_count,
  r.daily_count,
  r.status
FROM rnr_reminders r
JOIN candidates c ON r.candidate_id = c.id
JOIN users u ON r.recruiter_id = u.id
WHERE r.status = 'pending'
ORDER BY r.scheduled_for ASC;
```

### See reminders sent today
```sql
SELECT 
  COUNT(*) as total_sent_today,
  COUNT(DISTINCT candidate_id) as unique_candidates
FROM rnr_reminders
WHERE status = 'sent'
  AND DATE(sent_at) = CURRENT_DATE;
```

### See which recruiters have pending reminders
```sql
SELECT 
  u.name as recruiter_name,
  COUNT(*) as pending_reminders
FROM rnr_reminders r
JOIN users u ON r.recruiter_id = u.id
WHERE r.status = 'pending'
GROUP BY u.name
ORDER BY pending_reminders DESC;
```

---

## 📝 Files Created/Modified

### Created Files:
1. `src/rnr-reminders/rnr-reminders.service.ts` - Core business logic
2. `src/rnr-reminders/rnr-reminders.controller.ts` - API endpoints
3. `src/rnr-reminders/rnr-reminders.module.ts` - Module definition
4. `prisma/migrations/xxx_add_rnr_reminder_table/` - Database migration

### Modified Files:
1. `prisma/schema.prisma` - Added RNRReminder model
2. `src/candidates/candidates.service.ts` - Added RNR reminder triggers
3. `src/candidates/candidates.module.ts` - Imported RnrRemindersModule
4. `src/app.module.ts` - Registered RnrRemindersModule

---

## 🎨 Frontend Integration

### 1. Poll for Notifications
```typescript
// In your frontend app
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const notifications = await response.json();
    
    // Filter for RNR reminders
    const rnrReminders = notifications.data.filter(
      n => n.type === 'RNR_REMINDER' && n.status === 'unread'
    );
    
    if (rnrReminders.length > 0) {
      showRNRPopup(rnrReminders[0]);
    }
  }, 30000); // Check every 30 seconds
  
  return () => clearInterval(interval);
}, []);
```

### 2. Show Pop-up Modal
```typescript
function showRNRPopup(notification) {
  const { candidateName, candidateId } = notification.meta;
  
  // Show modal with:
  // - Candidate name
  // - Phone number
  // - "Call Now" button (opens dialer)
  // - "View Profile" button (navigates to candidate page)
  // - "Dismiss" button (calls dismissReminder API)
}
```

### 3. Dismiss Button Handler
```typescript
async function dismissReminder(reminderId) {
  await fetch(`/api/rnr-reminders/${reminderId}/dismiss`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // Close modal
  // Mark notification as read
}
```

---

## ⚠️ Important Notes

1. **Only RNR Status (ID: 8)** triggers reminders
2. **Only the recruiter who marked as RNR** gets reminders
3. **Maximum 2 reminders per day** per candidate
4. **5-hour intervals** between reminders
5. **Automatic cancellation** when status changes
6. **Cron job runs hourly** - reminders may be delayed by up to 1 hour

---

## 🐛 Troubleshooting

### Problem: No reminders being sent
**Check:**
1. Is the candidate actually in RNR status? (currentStatusId = 8)
2. Has the cron job run? (Check logs for "Starting RNR reminder processing")
3. Is scheduledFor in the past?
4. Is the reminder status 'pending'?

### Problem: Too many reminders
**Check:**
1. Daily limit logic (should be max 2 per day)
2. Check dailyCount field in database
3. Verify lastReminderDate is being updated

### Problem: Reminders not cancelled when status changes
**Check:**
1. Is the updateStatus method being called?
2. Check logs for "Cancelling reminders" message
3. Verify cancelRNRReminders is being triggered

---

## 🚀 Production Checklist

- [ ] Database migration applied
- [ ] Cron job confirmed running (check logs)
- [ ] Test RNR flow with real recruiter account
- [ ] Frontend pop-up modal implemented
- [ ] Notification polling set up
- [ ] Monitor database for reminder growth
- [ ] Set up alerts for failed reminder processing

---

## 📞 Support

If you encounter issues:
1. Check application logs for errors
2. Query `rnr_reminders` table for reminder status
3. Verify cron job is running (should see hourly logs)
4. Check notifications table for RNR_REMINDER entries

---

**System Status:** ✅ Ready for Testing
**Last Updated:** November 12, 2025