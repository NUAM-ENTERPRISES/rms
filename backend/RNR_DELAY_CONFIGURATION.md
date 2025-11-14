# How to Change RNR Reminder Delay Time

## Overview
The RNR (Ring Not Response) reminder system delay between reminders is **fully configurable** through the database. You can change it without modifying code!

## Current Settings
- **Delay Between Reminders**: `1 minute` (for testing)
- **Reminders Per Day**: `2`
- **Total Days**: `3`
- **Office Hours**: `9:00 AM - 6:00 PM`

---

## Method 1: Using API Endpoint (Recommended)

### Get Current Settings
```bash
GET http://localhost:3000/system-config/rnr-settings
Authorization: Bearer <your-jwt-token>
```

### Update Delay to 1 Minute (Testing)
```bash
PUT http://localhost:3000/system-config/rnr-settings
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "delayBetweenReminders": 1
}
```

### Update Delay to 4 Hours (Production)
```bash
PUT http://localhost:3000/system-config/rnr-settings
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "delayBetweenReminders": 240
}
```

### Update Multiple Settings at Once
```bash
PUT http://localhost:3000/system-config/rnr-settings
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "delayBetweenReminders": 120,
  "remindersPerDay": 3,
  "totalDays": 5,
  "officeHours": {
    "start": "08:00",
    "end": "20:00"
  }
}
```

---

## Method 2: Direct Database Update

### Using Prisma Studio
```bash
npm run db:studio
# Or
npx prisma studio --port 5556
```

1. Open Prisma Studio
2. Go to `SystemConfig` table
3. Find the row with `key = "RNR_SETTINGS"`
4. Edit the `value` JSON field
5. Change `delayBetweenReminders` to your desired minutes
6. Save

### Using SQL Query
```sql
UPDATE "SystemConfig"
SET value = jsonb_set(
  value,
  '{delayBetweenReminders}',
  '1'::jsonb
)
WHERE key = 'RNR_SETTINGS';
```

---

## Method 3: Re-run Seed Script

Edit the file: `prisma/seeds/system-config.seed.ts`

```typescript
const rnrSettings = {
  totalDays: 3,
  remindersPerDay: 2,
  delayBetweenReminders: 1, // ← CHANGE THIS VALUE
  officeHours: {
    start: '09:00',
    end: '18:00',
  },
  // ...
};
```

Then run:
```bash
npx ts-node prisma/seeds/system-config.seed.ts
```

---

## Common Delay Times

| Use Case | Minutes | Hours |
|----------|---------|-------|
| **Testing** | 1 | - |
| **Quick Testing** | 5 | - |
| **1 Hour** | 60 | 1 |
| **2 Hours** | 120 | 2 |
| **4 Hours (Default Production)** | 240 | 4 |
| **6 Hours** | 360 | 6 |

---

## Timeline Examples

### 1 Minute Delay (Testing)
```
Day 1:
├─ 9:00 AM - Reminder 1
├─ 9:01 AM - Reminder 2
└─ Done for day

Day 2:
├─ Next day at 9:00 AM - Reminder 1
├─ 9:01 AM - Reminder 2
└─ Done for day

Day 3:
├─ Next day at 9:00 AM - Reminder 1
├─ 9:01 AM - Reminder 2
└─ Completed! (CRE assignment triggers if still RNR)
```

### 4 Hours Delay (Production)
```
Day 1:
├─ 9:00 AM - Reminder 1
├─ 1:00 PM - Reminder 2
└─ Done for day

Day 2:
├─ Next day at 9:00 AM - Reminder 1
├─ 1:00 PM - Reminder 2
└─ Done for day

Day 3:
├─ Next day at 9:00 AM - Reminder 1
├─ 1:00 PM - Reminder 2
└─ Completed! (CRE assignment triggers if still RNR)
```

---

## Notes

1. **Cache Clearing**: When you update via API, the cache is automatically cleared. If you update directly in the database, restart the server or wait for cache expiration.

2. **Office Hours**: Reminders only send between 9 AM - 6 PM. If a reminder is scheduled outside these hours, it will be rescheduled for the next 30-minute check.

3. **Active Jobs**: Changes only affect NEW reminders. Existing scheduled jobs will continue with their original delay.

4. **Real-time**: Use 1 minute for testing, then change to 240 minutes (4 hours) for production.

---

## Troubleshooting

**Q: I changed the delay but reminders still use old timing?**
- Restart the server: `npm run start:dev`
- Or clear cache via API: The PUT endpoint automatically clears cache

**Q: Where can I see the current settings?**
- GET `/system-config/rnr-settings` API endpoint
- Or check `SystemConfig` table in database

**Q: Can I disable RNR reminders completely?**
- Yes! Set `totalDays: 0` or `remindersPerDay: 0`
