# DigitalOcean Spaces Setup Guide

This guide explains how to set up DigitalOcean Spaces for file uploads in the Affiniks RMS system.

## Overview

The system uses DigitalOcean Spaces (S3-compatible object storage) to store:
- User profile images
- Candidate profile images
- Candidate documents (passports, licenses, degrees, etc.)
- Candidate resumes

## File Organization Structure

Files are organized in the following structure:

```
your-bucket-name/
├── users/
│   └── profiles/
│       └── {userId}/
│           └── {fileName}
├── candidates/
│   ├── profiles/
│   │   └── {candidateId}/
│   │       └── {fileName}
│   ├── documents/
│   │   └── {candidateId}/
│   │       └── {docType}/
│   │           └── {fileName}
│   └── resumes/
│       └── {candidateId}/
│           └── {fileName}
```

## Setup Steps

### 1. Create a DigitalOcean Account

1. Go to [DigitalOcean](https://www.digitalocean.com/)
2. Sign up or log in to your account

### 2. Create a Space

1. Navigate to **Spaces** in the left sidebar
2. Click **Create Space**
3. Configure your Space:
   - **Choose a datacenter region**: Select the region closest to your users (e.g., NYC3, SFO3, AMS3)
   - **Choose a unique name**: Enter a globally unique name (e.g., `affiniks-rms-storage`)
   - **Enable CDN** (Recommended): Check this box for faster global file delivery
   - **File Listing**: Set to "Restricted" for security
   - Click **Create Space**

### 3. Get API Keys

1. Click on **API** in the left sidebar
2. Go to the **Spaces access keys** section
3. Click **Generate New Key**
4. Give it a name (e.g., "RMS Upload Service")
5. **IMPORTANT**: Copy both the **Access Key** and **Secret Key** immediately
   - The secret key will only be shown once!
   - Store them securely (you'll need them for the `.env` file)

### 4. Configure CORS (Important!)

To allow file uploads from your frontend:

1. Go to your Space's **Settings**
2. Scroll to **CORS Configurations**
3. Add a new CORS rule:
   ```
   Origin: http://localhost:5173 (for development)
   Allowed Methods: GET, POST, PUT, DELETE
   Allowed Headers: *
   ```
4. For production, add your production domain (e.g., `https://rms.affiniks.com`)

### 5. Update Backend Environment Variables

Add these variables to your backend `.env` file:

```env
# DigitalOcean Spaces Configuration
DO_SPACES_KEY=your_access_key_here
DO_SPACES_SECRET=your_secret_key_here
DO_SPACES_BUCKET=your-bucket-name
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_CDN_URL=https://your-bucket-name.nyc3.cdn.digitaloceanspaces.com
```

**Replace the following:**
- `your_access_key_here`: Your Spaces access key
- `your_secret_key_here`: Your Spaces secret key
- `your-bucket-name`: The name of your Space
- `nyc3`: Your chosen region code
- Update the endpoint and CDN URL to match your region

### 6. Verify Setup

1. Restart your backend server
2. Try uploading a profile image from the frontend
3. Check your Space in the DigitalOcean dashboard to see if the file appears

## File Upload Endpoints

### Upload User Profile Image
```
POST /api/v1/upload/profile-image/user/:userId
Content-Type: multipart/form-data
Body: file (image)
```

### Upload Candidate Profile Image
```
POST /api/v1/upload/profile-image/candidate/:candidateId
Content-Type: multipart/form-data
Body: file (image)
```

### Upload Document
```
POST /api/v1/upload/document/:candidateId
Content-Type: multipart/form-data
Body: 
  - file (PDF or image)
  - docType (string: passport, license, degree, etc.)
```

### Upload Resume
```
POST /api/v1/upload/resume/:candidateId
Content-Type: multipart/form-data
Body: file (PDF)
```

### Delete File
```
DELETE /api/v1/upload/file
Body: { fileUrl: "https://..." }
```

## File Constraints

### Profile Images
- **Allowed types**: JPEG, PNG, WebP, GIF
- **Maximum size**: 5MB
- **Recommended dimensions**: 400x400px or larger

### Documents
- **Allowed types**: PDF, JPEG, PNG, WebP
- **Maximum size**: 10MB

### Resumes
- **Allowed types**: PDF only
- **Maximum size**: 10MB

## Security Considerations

1. **Access Control**: 
   - Files are set to `public-read` ACL for easy access
   - Sensitive documents should use signed URLs (implement if needed)

2. **File Validation**:
   - File types are validated on both frontend and backend
   - File sizes are strictly enforced
   - Malicious file names are sanitized

3. **Authentication**:
   - All upload endpoints require valid JWT tokens
   - RBAC permissions are enforced (write:users, write:candidates, etc.)

4. **Rate Limiting**:
   - Upload endpoints are subject to standard rate limiting
   - Consider implementing per-user upload quotas

## Troubleshooting

### "Failed to upload file" Error
- Check that your Spaces credentials are correct
- Verify the bucket name matches exactly
- Ensure CORS is configured correctly
- Check network connectivity to DigitalOcean

### Files Not Appearing
- Verify the bucket region in your env vars
- Check file permissions in the Space settings
- Look for errors in backend logs

### CDN Issues
- CDN propagation can take up to 15 minutes
- Try using the endpoint URL instead of CDN URL temporarily
- Clear your browser cache

## Cost Estimation

DigitalOcean Spaces pricing (as of 2024):
- **Storage**: $5/month for 250GB
- **Bandwidth**: $1 per additional 1TB
- **CDN**: Included (up to 1TB/month)

Example costs:
- 10,000 profile images (500KB each) = ~5GB = $5/month
- 1,000 documents (2MB each) = ~2GB = $5/month
- Typical bandwidth for 1,000 active users = <100GB = Included

## Backup Recommendations

1. Enable **Spaces Backups** in DigitalOcean (snapshot-based)
2. Implement periodic exports of file metadata to your database backups
3. Consider cross-region replication for critical files
4. Document your disaster recovery procedure

## Migration from Local Storage

If you're migrating from local file storage:

1. Create a migration script to upload existing files
2. Update file URLs in the database
3. Verify all files are accessible
4. Keep local backup until confirmed
5. Remove local files after successful migration

## Next Steps

Once setup is complete:
1. Test file upload from the user interface
2. Verify files appear in your Space
3. Test file deletion
4. Monitor upload performance
5. Set up monitoring alerts for storage quota

## Support

For DigitalOcean Spaces support:
- Documentation: https://docs.digitalocean.com/products/spaces/
- Community: https://www.digitalocean.com/community/
- Support Tickets: Available for paid accounts

For RMS-specific issues:
- Check backend logs at `/var/log/rms/`
- Review this documentation
- Contact your development team

