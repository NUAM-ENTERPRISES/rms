# CRE Role Setup - Complete ✅

## What Was Created:

### 1. **CRE Role**
- **Role Name:** `CRE` (Candidate Relationship Executive)
- **Role ID:** `cmhx748te0000q4nb2dohxfej`
- **Description:** Handles escalated RNR candidates
- **Access:** Candidate management only (read, edit, write)

### 2. **CRE Permissions** (8 total)
The CRE role has the following permissions:

| Permission | Description |
|------------|-------------|
| `candidates:read` | View candidates |
| `candidates:write` | Create candidates |
| `candidates:edit` | Edit candidates |
| `candidates:status` | Update candidate status |
| `candidates:assign` | Assign candidates |
| `candidates:notes` | Add candidate notes |
| `candidates:qualifications` | Manage candidate qualifications |
| `notifications:read` | View their own notifications |

**What CRE CANNOT do:**
- ❌ Access projects
- ❌ Access teams
- ❌ Access users/admin
- ❌ Access jobs
- ❌ Access clients
- ❌ View/edit system settings

### 3. **Sample CRE User**
- **Email:** `cre@example.com`
- **User ID:** `cmhx748tw0009q4nb81m2e9p4`
- **Mobile:** `+1 9999999999`
- **Role:** CRE assigned

---

## How CRE Assignment Works:

```
1. Candidate → RNR Status
   ↓
2. 3 days of reminders (2 per day)
   ↓
3. Still in RNR after 3 days?
   ↓
4. System automatically assigns to CRE with least workload
   ↓
5. Notifications sent:
   - CRE gets "New RNR Candidate Assigned"
   - Original recruiter gets "Candidate Escalated to CRE"
```

---

## Testing the CRE User:

### 1. Login as CRE
```bash
POST /auth/login
{
  "email": "cre@example.com",
  "password": "<set-password-first>"
}
```

### 2. What CRE Can Access:
```bash
# ✅ View candidates
GET /candidates

# ✅ View specific candidate
GET /candidates/{id}

# ✅ Edit candidate
PUT /candidates/{id}

# ✅ Update candidate status
PUT /candidates/{id}/status

# ✅ View their notifications
GET /notifications

# ❌ Cannot access projects, teams, admin, etc.
```

---

## Creating Additional CRE Users:

### Method 1: Via Signup (if public registration enabled)
```bash
POST /auth/signup
{
  "email": "cre2@example.com",
  "name": "Second CRE User",
  "password": "SecurePassword123",
  "countryCode": "+1",
  "mobileNumber": "8888888888"
}
```

Then assign CRE role:
```sql
INSERT INTO "UserRole" ("userId", "roleId")
VALUES ('<user-id>', 'cmhx748te0000q4nb2dohxfej');
```

### Method 2: Direct Database Insert
```sql
-- Get the CRE role ID
SELECT id FROM "Role" WHERE name = 'CRE';

-- Assign to existing user
INSERT INTO "UserRole" ("userId", "roleId")
VALUES ('<existing-user-id>', 'cmhx748te0000q4nb2dohxfej');
```

---

## Verifying CRE Role:

### Check Role
```sql
SELECT * FROM "Role" WHERE name = 'CRE';
```

### Check Permissions
```sql
SELECT p."key", p.description
FROM "Permission" p
JOIN "RolePermission" rp ON rp."permissionId" = p.id
JOIN "Role" r ON r.id = rp."roleId"
WHERE r.name = 'CRE';
```

### Check CRE Users
```sql
SELECT u.id, u.name, u.email
FROM "User" u
JOIN "UserRole" ur ON ur."userId" = u.id
JOIN "Role" r ON r.id = ur."roleId"
WHERE r.name = 'CRE';
```

---

## RNR Settings Updated

The system configuration now includes the CRE role ID:

```json
{
  "totalDays": 3,
  "remindersPerDay": 2,
  "delayBetweenReminders": 1,
  "officeHours": {
    "start": "09:00",
    "end": "18:00"
  },
  "creAssignment": {
    "enabled": true,
    "afterDays": 3,
    "assignmentStrategy": "round_robin",
    "creRoleId": "cmhx748te0000q4nb2dohxfej"  ← Added!
  }
}
```

---

## Next Steps:

1. **Set Password for Sample CRE User:**
   - Login as admin
   - Reset password for `cre@example.com`
   - Or update password hash in database

2. **Create More CRE Users:**
   - Use the methods above to add more CRE team members

3. **Test CRE Assignment:**
   - Set a candidate to RNR status
   - Wait for 3 days (or fast-forward with SQL)
   - Verify CRE gets assigned and receives notification

4. **Adjust Permissions (if needed):**
   - Add more permissions to CRE role if required
   - Remove permissions if too permissive

---

## Files Created/Modified:

| File | Status |
|------|--------|
| `prisma/seeds/cre-role.seed.ts` | ✅ Created |
| Database: `Role` table | ✅ CRE role added |
| Database: `Permission` table | ✅ 8 permissions added |
| Database: `RolePermission` table | ✅ Permissions linked |
| Database: `User` table | ✅ Sample CRE user added |
| Database: `UserRole` table | ✅ Role assigned |
| Database: `SystemConfig` table | ✅ CRE role ID updated |

---

🎉 **CRE Role is now fully configured and ready to use!**
