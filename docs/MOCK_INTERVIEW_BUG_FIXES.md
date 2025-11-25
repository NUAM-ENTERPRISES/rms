# Mock Interview Coordination - Bug Fixes

## Issue Report

Date: 2025-11-25
Severity: Critical - Application Crash

---

## Bugs Identified

### Bug 1: TypeError - Cannot read properties of undefined (reading 'map')

**Location**: `interviews.endpoints.ts:27`

**Error Stack**:

```
TypeError: Cannot read properties of undefined (reading 'map')
at providesTags (interviews.endpoints.ts:27:30)
```

**Root Cause**:
The `providesTags` callback in RTK Query endpoints was not safely checking if `result.data` exists before calling `.map()` on it.

**Problematic Code**:

```typescript
providesTags: (result) =>
  result
    ? [
        ...result.data.map(({ id }) => ({  // ❌ result.data could be undefined
          type: "MockInterview" as const,
          id,
        })),
        { type: "MockInterview", id: "LIST" },
      ]
    : [{ type: "MockInterview", id: "LIST" }],
```

**Why It Crashes**:

- When API returns an error response (401, 404, 500, etc.), the response structure is different
- `result` exists but `result.data` is undefined
- Calling `.map()` on undefined throws TypeError
- This crashes the entire React application

**Affected Files**:

1. `interviews/data/interviews.endpoints.ts`
2. `training/data/training.endpoints.ts`
3. `templates/data/templates.endpoints.ts`

---

### Bug 2: 404 Not Found - Training Endpoint

**Error**: `GET http://localhost:3000/api/v1/training 404`

**Root Cause**:
Frontend and backend route mismatch. The training endpoints use `/training/assignments` as the base path, not `/training`.

**Backend Routes** (from `training.controller.ts`):

```typescript
@Controller('training')
export class TrainingController {
  @Get('assignments')        // GET /training/assignments
  @Post('assignments')       // POST /training/assignments
  @Get('assignments/:id')    // GET /training/assignments/:id
  @Patch('assignments/:id')  // PATCH /training/assignments/:id
  // ... etc
}
```

**Frontend Wrong Calls**:

```typescript
// ❌ Wrong URLs
url: "/training"; // Should be /training/assignments
url: "/training/:id"; // Should be /training/assignments/:id
url: "/training/:id/start"; // Should be /training/assignments/:id/start
url: "/training/:id/complete"; // Should be /training/assignments/:id/complete
```

**Why Backend Uses `/assignments` Suffix**:
The backend groups training-related endpoints:

- `/training/assignments` - Training assignment CRUD
- `/training/sessions` - Training session CRUD
- `/training/assignments/:id/sessions` - Get sessions for assignment

This provides better API organization and clarity.

---

## Fixes Applied

### Fix 1: Safe providesTags with Null Checks

**Solution**: Add proper null/undefined checks before calling `.map()`

**Fixed Code**:

```typescript
providesTags: (result) =>
  result?.data && Array.isArray(result.data)  // ✅ Safe check
    ? [
        ...result.data.map(({ id }) => ({
          type: "MockInterview" as const,
          id,
        })),
        { type: "MockInterview", id: "LIST" },
      ]
    : [{ type: "MockInterview", id: "LIST" }],
```

**What This Does**:

1. `result?.data` - Optional chaining, returns undefined if result is null/undefined
2. `Array.isArray(result.data)` - Verifies data is actually an array
3. Only calls `.map()` if both conditions are true
4. Returns fallback tags if data is unavailable

**Applied To**:

- ✅ `interviews/data/interviews.endpoints.ts` - getMockInterviews
- ✅ `training/data/training.endpoints.ts` - getTrainingAssignments
- ✅ `templates/data/templates.endpoints.ts` - getTemplates

---

### Fix 2: Correct Training Endpoint URLs

**Changes Made**:

| Endpoint | Before (Wrong)           | After (Correct)                      |
| -------- | ------------------------ | ------------------------------------ |
| Get All  | `/training`              | `/training/assignments`              |
| Get One  | `/training/:id`          | `/training/assignments/:id`          |
| Create   | `/training`              | `/training/assignments`              |
| Update   | `/training/:id`          | `/training/assignments/:id`          |
| Start    | `/training/:id/start`    | `/training/assignments/:id/start`    |
| Complete | `/training/:id/complete` | `/training/assignments/:id/complete` |
| Delete   | `/training/:id`          | `/training/assignments/:id`          |

**Note**: Session endpoints were already correct:

- ✅ `/training/sessions` (for create)
- ✅ `/training/sessions/:id` (for update/delete/complete)

---

## Testing

### Before Fix:

```bash
❌ GET /training → 404 Not Found
❌ Application crashes with TypeError
❌ Cannot view training list
❌ Cannot manage training programs
```

### After Fix:

```bash
✅ GET /training/assignments → 200 OK
✅ No TypeError crashes
✅ Training list loads correctly
✅ Can manage training programs
✅ Build passes successfully
```

---

## Root Cause Analysis

### Why These Bugs Occurred:

1. **Insufficient Error Handling**:

   - RTK Query endpoints assumed API always returns successful responses
   - Didn't account for error responses with different structures
   - Common mistake: assuming `result` existence means `result.data` exists

2. **Backend Route Misunderstanding**:

   - Initially thought routes were `/training/*`
   - Missed the `/assignments` suffix in the controller
   - Didn't verify backend routes before creating frontend endpoints

3. **Lack of Type Safety**:
   - TypeScript can't catch runtime structure differences
   - API responses can vary based on success/error
   - Need defensive programming for external data

---

## Prevention Guidelines

### For Future Endpoint Creation:

1. **Always Use Safe providesTags**:

```typescript
// ✅ Good Pattern
providesTags: (result) =>
  result?.data && Array.isArray(result.data)
    ? [...result.data.map(item => ({ type: "Tag", id: item.id })), { type: "Tag", id: "LIST" }]
    : [{ type: "Tag", id: "LIST" }],
```

2. **Verify Backend Routes First**:

```bash
# Check controller file
grep -n "@Get\|@Post\|@Patch\|@Delete" backend/src/path/controller.ts

# Or check Swagger docs
http://localhost:3000/api/docs
```

3. **Test Error Cases**:

   - Test with 401 Unauthorized
   - Test with 404 Not Found
   - Test with 500 Server Error
   - Ensure app doesn't crash on API errors

4. **Use Consistent Patterns**:
   - If one endpoint uses `/resource/subroute`, all related endpoints should too
   - Document API structure in types file
   - Create constants for base paths

---

## Files Modified

### Frontend Changes:

1. `web/src/features/mock-interview-coordination/training/data/training.endpoints.ts`

   - Fixed all 7 training assignment endpoint URLs
   - Added safe providesTags check

2. `web/src/features/mock-interview-coordination/interviews/data/interviews.endpoints.ts`

   - Added safe providesTags check

3. `web/src/features/mock-interview-coordination/templates/data/templates.endpoints.ts`
   - Added safe providesTags check

### Backend Changes:

- None required (backend was correct)

---

## Impact Assessment

### Before:

- 🔴 Critical: Application unusable
- 🔴 High: Cannot access training features
- 🔴 High: TypeError crashes entire app
- 🟡 Medium: Poor user experience

### After:

- 🟢 Application stable and functional
- 🟢 All features accessible
- 🟢 Graceful error handling
- 🟢 Good user experience

---

## Lessons Learned

1. **Defensive Programming**: Always assume external data could be null/undefined
2. **Verify Routes**: Check backend implementation before creating frontend calls
3. **Error Handling**: Plan for failure cases, not just success cases
4. **Type Safety**: TypeScript helps but can't catch all runtime issues
5. **Testing**: Test error scenarios, not just happy paths

---

## Checklist for New Endpoints

When creating new RTK Query endpoints, verify:

- [ ] Backend route matches exactly (check controller)
- [ ] providesTags handles undefined data safely
- [ ] invalidatesTags targets correct tag types
- [ ] Error responses don't crash the app
- [ ] Loading states work correctly
- [ ] Success responses parse as expected
- [ ] Build passes with no TypeScript errors
- [ ] Tested with actual backend API

---

## Conclusion

Both bugs were caused by:

1. Insufficient null safety in RTK Query tags
2. Route mismatch between frontend and backend

The fixes ensure:

- ✅ Application doesn't crash on API errors
- ✅ Training endpoints call correct backend routes
- ✅ All mock interview features work as expected
- ✅ Graceful degradation when APIs fail

**Status**: ✅ All issues resolved and tested
**Build**: ✅ Passing
**Runtime**: ✅ Stable
