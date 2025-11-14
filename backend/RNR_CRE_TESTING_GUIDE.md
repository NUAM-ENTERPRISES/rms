# RNR to CRE Assignment - Complete Flow Testing Guide

## Overview
This guide will help you test the complete RNR (Ring Not Response) to CRE (Candidate Recruitment Employee) assignment flow.

---

## **The Complete Flow**

```
1. Candidate → RNR Status (statusId = 8)
   ↓
2. RNR Reminder Created (daysCompleted = 0)
   ↓
3. Day 1: 2 reminders sent (e.g., 9:00 AM, 9:01 AM with 1-min delay)
   ↓
4. Day 2: 2 reminders sent (9:00 AM, 9:01 AM)
   ↓
5. Day 3: 2 reminders sent (9:00 AM, 9:01 AM)
   ↓
6. After 3 Days Completed:
   - Check if candidate still in RNR (statusId = 8)
   - Assign to CRE using least-loaded strategy
   - Send notification to CRE (new assignment)
   - Send notification to original recruiter (escalation)
   - Update reminder: creAssigned = true
```

---

## **Prerequisites**

### 1. System Configuration
Ensure RNR settings are configured for fast testing:

```bash
# Check current settings
GET http://localhost:3000/system-config/rnr-settings

# Set to 1-minute delay for testing
PUT http://localhost:3000/system-config/rnr-settings
{
  "delayBetweenReminders": 1,
  "totalDays": 3,
  "remindersPerDay": 2,
  "officeHours": {
    "start": "09:00",
    "end": "18:00"
  },
  "creAssignment": {
    "enabled": true,
    "afterDays": 3
  }
}
```

### 2. Test Data Required
- ✅ At least 1 Candidate
- ✅ At least 1 Recruiter (to be assigned initially)
- ✅ At least 1 CRE user (role: 'CRE')
- ✅ RNR Status (statusId = 8)

---

## **Testing Steps**

### **Step 1: Set Candidate to RNR Status**

```bash
# Update candidate status to RNR
PUT http://localhost:3000/candidates/{candidateId}/status
{
  "statusId": 8,
  "reason": "Testing RNR reminder system"
}
```

**Expected:**
- ✅ Candidate status updated to RNR
- ✅ RNRReminder created with:
  - `status: 'pending'`
  - `daysCompleted: 0`
  - `dailyCount: 0`
  - `reminderCount: 0`
  - `creAssigned: false`
- ✅ First job scheduled in BullMQ queue

**Verify in Database:**
```sql
SELECT * FROM "RNRReminder" 
WHERE "candidateId" = '<your-candidate-id>' 
ORDER BY "createdAt" DESC LIMIT 1;
```

---

### **Step 2: Monitor Day 1 Reminders**

**Timeline (with 1-minute delay):**
```
9:00 AM → Reminder 1 sent
9:01 AM → Reminder 2 sent
✅ Done for Day 1
```

**Check Database After Each Reminder:**
```sql
SELECT 
  "daysCompleted", 
  "dailyCount", 
  "reminderCount", 
  "lastReminderDate",
  "status"
FROM "RNRReminder" 
WHERE "candidateId" = '<your-candidate-id>';
```

**After Reminder 1:**
- `daysCompleted: 0`
- `dailyCount: 1`
- `reminderCount: 1`

**After Reminder 2:**
- `daysCompleted: 0`
- `dailyCount: 2`
- `reminderCount: 2`

**Check Notifications:**
```sql
SELECT * FROM "Notification" 
WHERE "userId" = '<recruiter-id>' 
AND "type" = 'RNR_REMINDER'
ORDER BY "createdAt" DESC LIMIT 2;
```

---

### **Step 3: Simulate Day 2 (Next Day)**

**Option A: Wait for Real Next Day**
- Just wait until the next day at 9 AM
- System will detect new day automatically

**Option B: Manually Trigger (For Fast Testing)**
```sql
-- Update lastReminderDate to yesterday
UPDATE "RNRReminder"
SET "lastReminderDate" = NOW() - INTERVAL '1 day'
WHERE "candidateId" = '<your-candidate-id>';

-- Then manually trigger the job or wait for next scheduled run
```

**Expected:**
- ✅ System detects new day
- ✅ `daysCompleted` increments to 1
- ✅ `dailyCount` resets to 0
- ✅ 2 more reminders sent

---

### **Step 4: Simulate Day 3**

Repeat Step 3 process.

**Expected:**
- ✅ `daysCompleted` increments to 2
- ✅ `dailyCount` resets to 0
- ✅ 2 more reminders sent

---

### **Step 5: Trigger CRE Assignment (After Day 3)**

Simulate one more day passing:

```sql
-- Simulate Day 4 to trigger CRE assignment
UPDATE "RNRReminder"
SET "lastReminderDate" = NOW() - INTERVAL '1 day',
    "daysCompleted" = 2  -- Day 3 completed
WHERE "candidateId" = '<your-candidate-id>';

-- Make sure candidate is still in RNR status
SELECT "currentStatusId" FROM "Candidate" 
WHERE "id" = '<your-candidate-id>';
-- Should be 8 (RNR)
```

**Then trigger the next reminder job. The system will:**

1. **Detect 3 days completed**
2. **Check if candidate still in RNR** (statusId = 8)
3. **Check if CRE already assigned** (should be false)
4. **Assign CRE** using least-loaded strategy
5. **Send 2 notifications:**
   - To CRE: "New RNR Candidate Assigned"
   - To Recruiter: "RNR Candidate Escalated to CRE"
6. **Update reminder:**
   - `creAssigned: true`
   - `creAssignedAt: <timestamp>`
   - `creAssignedTo: <cre-user-id>`
   - `status: 'completed'`

---

## **Verification Queries**

### Check RNR Reminder Status
```sql
SELECT 
  "id",
  "candidateId",
  "daysCompleted",
  "dailyCount",
  "reminderCount",
  "status",
  "creAssigned",
  "creAssignedAt",
  "creAssignedTo"
FROM "RNRReminder"
WHERE "candidateId" = '<your-candidate-id>';
```

### Check CRE Assignment
```sql
SELECT 
  cra."id",
  cra."candidateId",
  cra."recruiterId",
  cra."assignmentType",
  cra."assignedAt",
  cra."reason",
  u."name" as "creName",
  u."email" as "creEmail"
FROM "CandidateRecruiterAssignment" cra
JOIN "User" u ON u."id" = cra."recruiterId"
WHERE cra."candidateId" = '<your-candidate-id>'
  AND cra."isActive" = true
  AND cra."assignmentType" = 'manual'  -- Will be 'manual' from assignCREToCandidate
ORDER BY cra."assignedAt" DESC;
```

### Check Notifications Sent
```sql
-- CRE Notification
SELECT * FROM "Notification"
WHERE "type" = 'CRE_ASSIGNMENT'
  AND "meta"->>'candidateId' = '<your-candidate-id>'
ORDER BY "createdAt" DESC LIMIT 1;

-- Recruiter Escalation Notification
SELECT * FROM "Notification"
WHERE "type" = 'RNR_ESCALATION'
  AND "meta"->>'candidateId' = '<your-candidate-id>'
ORDER BY "createdAt" DESC LIMIT 1;
```

---

## **Expected Logs**

Watch the server logs for these key messages:

```
[RnrReminderProcessor] Processing RNR reminder job...
[RnrReminderProcessor] [DEBUG] Current reminder state: daysCompleted=0, dailyCount=0, reminderCount=0
[RnrReminderProcessor] Sent RNR notification to recruiter... (Day 1, Reminder 1)

... (1 minute later)

[RnrReminderProcessor] [DEBUG] Current reminder state: daysCompleted=0, dailyCount=1, reminderCount=1
[RnrReminderProcessor] Sent RNR notification to recruiter... (Day 1, Reminder 2)

... (next day)

[RnrReminderProcessor] [DEBUG] NEW DAY detected! Incrementing daysCompleted: 0 -> 1
[RnrReminderProcessor] Sent RNR notification to recruiter... (Day 2, Reminder 1)

... (after day 3 completed)

[RnrReminderProcessor] [DEBUG] Reached 3 days. Marking as completed and triggering CRE assignment.
[RnrReminderProcessor] [CRE ASSIGNMENT] Starting CRE assignment for candidate...
[RnrReminderProcessor] [CRE ASSIGNMENT] Successfully assigned CRE ... to candidate ...
[RnrReminderProcessor] [CRE ASSIGNMENT] Sent notifications to CRE and original recruiter
[RnrReminderProcessor] [CRE ASSIGNMENT] Completed CRE assignment process
```

---

## **Edge Cases to Test**

### 1. Candidate Status Changes Before 3 Days
```
- Set candidate to RNR
- After Day 1, change status to "In Progress"
- Expected: Reminders stop, CRE assignment doesn't happen
```

### 2. CRE Already Assigned
```
- Manually assign a CRE to the candidate
- Complete 3 days
- Expected: No duplicate CRE assignment
```

### 3. Multiple Status Changes to RNR
```
- Set to RNR (creates reminder)
- Change to "In Progress" (cancels reminder)
- Change back to RNR (RESETS same reminder)
- Expected: Same reminder reused, counters reset to 0
```

### 4. Outside Office Hours
```
- Trigger reminder at 8 PM
- Expected: Job rescheduled for 30 minutes later, won't send until 9 AM
```

---

## **Fast Testing Script (Optional)**

For super fast testing without waiting for real days:

```sql
-- Start fresh
DELETE FROM "RNRReminder" WHERE "candidateId" = '<test-candidate-id>';
UPDATE "Candidate" SET "currentStatusId" = 8 WHERE "id" = '<test-candidate-id>';

-- Wait for reminder creation, then fast-forward through days:

-- After Day 1 reminders (2 sent):
UPDATE "RNRReminder" 
SET "lastReminderDate" = NOW() - INTERVAL '1 day',
    "daysCompleted" = 0,
    "dailyCount" = 2
WHERE "candidateId" = '<test-candidate-id>';
-- Trigger next job → Day 2 starts

-- After Day 2 reminders (2 sent):
UPDATE "RNRReminder" 
SET "lastReminderDate" = NOW() - INTERVAL '1 day',
    "daysCompleted" = 1,
    "dailyCount" = 2
WHERE "candidateId" = '<test-candidate-id>';
-- Trigger next job → Day 3 starts

-- After Day 3 reminders (2 sent):
UPDATE "RNRReminder" 
SET "lastReminderDate" = NOW() - INTERVAL '1 day',
    "daysCompleted" = 2,
    "dailyCount" = 2
WHERE "candidateId" = '<test-candidate-id>';
-- Trigger next job → CRE assignment happens!
```

---

## **Success Criteria**

✅ **Day 1-3**: 2 reminders sent each day (total: 6 reminders)
✅ **Day tracking**: `daysCompleted` increments properly (0→1→2→3)
✅ **Daily reset**: `dailyCount` resets to 0 each new day
✅ **CRE assignment**: Triggered after 3 days if still RNR
✅ **Notifications**: 2 notifications sent (CRE + Recruiter)
✅ **Database**: `creAssigned=true`, `creAssignedTo` populated
✅ **Status**: Reminder marked as `'completed'`

---

## **Troubleshooting**

**Q: Reminders not sending?**
- Check BullMQ queue: Are jobs being processed?
- Check time: Are you within office hours (9 AM - 6 PM)?
- Check logs for errors

**Q: CRE assignment not happening?**
- Verify `creAssignment.enabled: true` in config
- Verify candidate still has `currentStatusId = 8`
- Check if CRE role exists in your database
- Check logs for `[CRE ASSIGNMENT]` messages

**Q: Getting "CRE not found" error?**
- Ensure at least one user has role 'CRE'
- Check RecruiterAssignmentService.getCREWithLeastWorkload()

---

Good luck with testing! 🚀
