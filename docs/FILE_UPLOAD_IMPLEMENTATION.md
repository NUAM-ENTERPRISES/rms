# File Upload System Implementation Summary

## Overview

This document summarizes the complete file upload system implementation for the Affiniks RMS, including DigitalOcean Spaces integration, profile images, and document management.

## What Has Been Implemented

### Backend Implementation ✅

#### 1. Database Schema Updates
- **Added `profileImage` field** to both `User` and `Candidate` models
- **Migration created**: `20251008132317_add_profile_images`
- Field stores the full URL to the file in DigitalOcean Spaces

#### 2. Upload Service Module
**Location**: `/backend/src/upload/`

**Files Created:**
- `upload.service.ts` - Core upload logic with DO Spaces integration
- `upload.controller.ts` - HTTP endpoints for file operations
- `upload.module.ts` - NestJS module configuration

**Features:**
- ✅ S3-compatible client for DigitalOcean Spaces
- ✅ File validation (type, size)
- ✅ Unique file naming with timestamps and hashes
- ✅ Organized folder structure
- ✅ Public file uploads with CDN support
- ✅ File deletion capability
- ✅ Signed URL generation for private files

**Upload Methods:**
```typescript
uploadProfileImage(file, entityType, entityId) // User or Candidate profiles
uploadDocument(file, candidateId, docType)      // Candidate documents
uploadResume(file, candidateId)                 // Candidate resumes
deleteFile(fileUrl)                             // Delete any file
getSignedUrl(fileUrl, expiresIn)               // Get temporary access URL
```

#### 3. API Endpoints
All endpoints are protected with JWT + RBAC permissions:

| Endpoint | Method | Permission | Description |
|----------|--------|-----------|-------------|
| `/api/v1/upload/profile-image/user/:userId` | POST | `write:users` | Upload user profile image |
| `/api/v1/upload/profile-image/candidate/:candidateId` | POST | `write:candidates` | Upload candidate profile image |
| `/api/v1/upload/document/:candidateId` | POST | `write:documents` | Upload candidate document |
| `/api/v1/upload/resume/:candidateId` | POST | `write:candidates` | Upload candidate resume |
| `/api/v1/upload/file` | DELETE | `manage:*` | Delete any file |

#### 4. DTOs Updated
- ✅ `CreateUserDto` - Added optional `profileImage` field
- ✅ `UpdateUserDto` - Inherits `profileImage` from CreateUserDto
- ✅ `CreateCandidateDto` - Added optional `profileImage` field
- ✅ `UpdateCandidateDto` - Inherits `profileImage` from CreateCandidateDto

#### 5. Services Updated
- ✅ `UsersService.create()` - Now saves profileImage URL
- ✅ `CandidatesService.create()` - Now saves profileImage URL
- ✅ `CandidatesService.update()` - Now handles profileImage updates

#### 6. Environment Variables
Required env vars (add to your `.env`):
```env
DO_SPACES_KEY=your_access_key
DO_SPACES_SECRET=your_secret_key
DO_SPACES_BUCKET=your-bucket-name
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_CDN_URL=https://your-bucket-name.nyc3.cdn.digitaloceanspaces.com
```

### Frontend Implementation ✅

#### 1. Upload API Service
**Location**: `/web/src/services/uploadApi.ts`

**RTK Query Endpoints:**
```typescript
useUploadUserProfileImageMutation()        // Upload user profile image
useUploadCandidateProfileImageMutation()   // Upload candidate profile image
useUploadDocumentMutation()                // Upload candidate document
useUploadResumeMutation()                  // Upload candidate resume
useDeleteFileMutation()                    // Delete file
```

#### 2. Reusable Upload Components
**Location**: `/web/src/components/molecules/`

**ProfileImageUpload.tsx** - Profile image upload with preview
- ✅ Circular image preview
- ✅ Drag & drop support
- ✅ File type validation (JPEG, PNG, WebP, GIF)
- ✅ File size validation (max 5MB)
- ✅ Upload progress indication
- ✅ Image remove capability
- ✅ Hover overlay for change photo
- ✅ Responsive sizing (sm, md, lg, xl)

**DocumentUpload.tsx** - Document upload and management
- ✅ Drag & drop area
- ✅ File type validation (PDF, images)
- ✅ File size validation (max 10MB)
- ✅ Multiple document support
- ✅ Document list with preview
- ✅ Document status badges (pending, verified, rejected)
- ✅ Download and view actions
- ✅ Remove document capability
- ✅ Modern card-based UI

#### 3. Components Exported
Both components are now exported from `/web/src/components/molecules/index.ts`

## File Organization in DO Spaces

```
your-bucket-name/
├── users/
│   └── profiles/
│       └── {userId}/
│           └── profile-{timestamp}-{hash}.jpg
├── candidates/
│   ├── profiles/
│   │   └── {candidateId}/
│   │       └── profile-{timestamp}-{hash}.jpg
│   ├── documents/
│   │   └── {candidateId}/
│   │       └── {docType}/
│   │           └── document-{timestamp}-{hash}.pdf
│   └── resumes/
│       └── {candidateId}/
│           └── resume-{timestamp}-{hash}.pdf
```

## What Still Needs To Be Done

### High Priority 🔴

#### 1. Integrate Profile Upload in User Pages
**Files to update:**
- `/web/src/features/admin/views/CreateUserPage.tsx`
- `/web/src/features/admin/views/EditUserPage.tsx`

**Implementation steps:**
```tsx
// In CreateUserPage.tsx
import { ProfileImageUpload } from '@/components/molecules';
import { useUploadUserProfileImageMutation } from '@/services/uploadApi';

const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [uploadImage] = useUploadUserProfileImageMutation();

// After user creation success:
if (selectedImage && result.data.id) {
  const uploadResult = await uploadImage({
    userId: result.data.id,
    file: selectedImage,
  }).unwrap();
  
  // Update user with profileImage URL
  await updateUser({
    id: result.data.id,
    profileImage: uploadResult.data.fileUrl,
  });
}
```

#### 2. Display Profile Images
**Files to update:**
- `/web/src/features/admin/views/UserListPage.tsx` - Show avatar in list
- `/web/src/features/admin/views/UserDetailsPage.tsx` - Show large profile image
- Any other user display components

**Implementation:**
```tsx
// User avatar display
{user.profileImage ? (
  <img src={user.profileImage} alt={user.name} className="w-10 h-10 rounded-full" />
) : (
  <User className="w-10 h-10 p-2 bg-slate-200 rounded-full" />
)}
```

#### 3. Integrate Profile Upload in Candidate Pages
**Files to update:**
- `/web/src/features/candidates/views/CreateCandidatePage.tsx`
- `/web/src/features/candidates/views/CandidateDetailPage.tsx` (or similar edit page)

**Same pattern as users:**
- Add ProfileImageUpload component
- Save selected file to state
- Upload after candidate creation
- Update candidate record with profileImage URL

#### 4. Integrate Backend with Candidate List
**Current state:** CandidateDetailPage uses mock data

**Files to update:**
- `/web/src/features/candidates/views/CandidatesPage.tsx`
- `/web/src/features/candidates/views/CandidateDetailPage.tsx`

**Implementation:**
```tsx
// Replace mock data with RTK Query
import { useGetCandidatesQuery, useGetCandidateQuery } from '@/features/candidates';

const { data: candidatesData, isLoading } = useGetCandidatesQuery({});
const candidates = candidatesData?.data?.candidates || [];
```

#### 5. Add Document Upload to Candidate Detail Page
**File:** `/web/src/features/candidates/views/CandidateDetailPage.tsx`

**Add new tab for Documents:**
```tsx
<TabsContent value="documents">
  <DocumentUpload
    title="Candidate Documents"
    description="Upload and manage candidate documents (passport, licenses, degrees, etc.)"
    documents={candidateDocuments}
    onFileSelected={handleDocumentUpload}
    onDocumentRemove={handleDocumentRemove}
    uploading={uploadingDocument}
  />
</TabsContent>
```

#### 6. Update Candidate Create Page UI
**File:** `/web/src/features/candidates/views/CreateCandidatePage.tsx`

**Changes needed:**
- ✅ Already follows modern UI design (gradient background, cards)
- ❌ **Remove back button** (as per user request)
- ❌ **Add ProfileImageUpload component**
- ❌ **Add DocumentUpload component for resume**
- ❌ **Integrate with backend** (currently creates candidate without uploads)

### Medium Priority 🟡

#### 7. Create Candidate API Endpoints
**Check if these exist:**
- `useGetCandidatesQuery` - List candidates
- `useGetCandidateQuery` - Get single candidate
- `useCreateCandidateMutation` - Create candidate
- `useUpdateCandidateMutation` - Update candidate
- `useDeleteCandidateMutation` - Delete candidate

**If missing, create in:**
`/web/src/features/candidates/data/candidates.endpoints.ts`

#### 8. Document Verification Integration
Since you have a document verification system, integrate it with DocumentUpload:

```tsx
<DocumentUpload
  documents={documents.map(doc => ({
    id: doc.id,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    status: doc.status, // 'pending' | 'verified' | 'rejected'
  }))}
  onDocumentView={(doc) => {
    // Open document verification modal
  }}
/>
```

### Low Priority 🟢

#### 9. Image Optimization
Consider adding image optimization:
- Resize large images on upload
- Generate thumbnails
- Convert to WebP for better compression

#### 10. Progress Tracking
Add upload progress indicators:
```tsx
const [uploadProgress, setUploadProgress] = useState(0);
// Implement with axios or fetch onProgress
```

#### 11. Drag and Drop for Profile Images
ProfileImageUpload currently supports click-to-upload. Consider adding drag & drop like DocumentUpload.

#### 12. File Preview Modal
Create a modal for viewing documents before download:
```tsx
<DocumentPreviewModal
  document={selectedDocument}
  onClose={() => setSelectedDocument(null)}
/>
```

## Testing Checklist

### Backend Tests
- [ ] Upload user profile image endpoint
- [ ] Upload candidate profile image endpoint
- [ ] Upload document endpoint
- [ ] Upload resume endpoint
- [ ] Delete file endpoint
- [ ] File validation (type, size)
- [ ] Permission checks
- [ ] Database updates with profileImage URL

### Frontend Tests
- [ ] ProfileImageUpload component renders
- [ ] ProfileImageUpload validates file types
- [ ] ProfileImageUpload validates file sizes
- [ ] DocumentUpload component renders
- [ ] DocumentUpload drag & drop works
- [ ] File upload triggers API call
- [ ] Profile images display in user list
- [ ] Profile images display in candidate list
- [ ] Documents display in candidate detail page
- [ ] File deletion works

## Setup Instructions for Developer

1. **Install Backend Dependencies** (Already done):
   ```bash
   cd backend
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer @nestjs/platform-express
   ```

2. **Run Prisma Migration** (Already done):
   ```bash
   npx prisma migrate dev
   ```

3. **Setup DigitalOcean Spaces**:
   - Follow `/docs/DIGITALOCEAN_SPACES_SETUP.md`
   - Create Space
   - Get API keys
   - Configure CORS
   - Update `.env` file

4. **Start Backend**:
   ```bash
   npm run start:dev
   ```

5. **Test Upload Endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/upload/profile-image/user/USER_ID \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "file=@/path/to/image.jpg"
   ```

6. **Integrate Frontend Components** (Next steps):
   - Follow "What Still Needs To Be Done" section above

## Architecture Decisions

### Why DigitalOcean Spaces?
- ✅ S3-compatible (easy migration)
- ✅ Integrated CDN
- ✅ Simple pricing
- ✅ Good performance
- ✅ Easy to use

### Why Store URLs in Database?
- ✅ Fast queries (no need to list bucket)
- ✅ Easy to display
- ✅ Support for signed URLs
- ✅ Industry standard practice

### Why Separate Upload Endpoints?
- ✅ Different file constraints
- ✅ Different permissions
- ✅ Clear separation of concerns
- ✅ Better error handling

### Why Upload After Entity Creation?
- ✅ Ensures entity exists before file upload
- ✅ Can associate file with entity ID
- ✅ Better error handling (entity creation can fail without orphaned files)
- ✅ Organized file structure in bucket

## Common Issues & Solutions

### Issue: "Access Denied" when uploading
**Solution**: Check DO Spaces credentials in .env file

### Issue: CORS error from frontend
**Solution**: Configure CORS in DO Spaces settings

### Issue: File URL not saving to database
**Solution**: Check that profileImage field is in DTO and being saved in service

### Issue: Profile image not displaying
**Solution**: 
1. Check if fileUrl is correct
2. Verify file is public-read in DO Spaces
3. Check browser console for errors

## Next Steps Summary

1. ✅ **Setup DigitalOcean Spaces** - Follow DIGITALOCEAN_SPACES_SETUP.md
2. 🔴 **Integrate profile upload in CreateUserPage**
3. 🔴 **Integrate profile upload in CreateCandidatePage**
4. 🔴 **Connect candidate pages with backend (remove mock data)**
5. 🔴 **Add document upload to candidate detail page**
6. 🔴 **Display profile images in lists and detail pages**
7. 🟡 **Add document verification integration**
8. ✅ **Test everything**

## Questions?

If you have questions about:
- **DigitalOcean setup** → See DIGITALOCEAN_SPACES_SETUP.md
- **Backend implementation** → Check `/backend/src/upload/` files
- **Frontend components** → Check `/web/src/components/molecules/` files
- **Integration examples** → See code snippets in this document

---

**Last Updated**: October 8, 2025
**Status**: Backend Complete ✅ | Frontend Components Complete ✅ | Integration Pending 🔴

