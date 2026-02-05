# Create WhatsApp Template for Status Updates

## Template Details

**Template Name:** `candidate_status_update`

**Category:** UTILITY

**Language:** English

**Template Content:**
```
Hello {{1}}, your application status has been updated to: {{2}}
```

## Steps to Create Template in Facebook Business Manager

### 1. Go to WhatsApp Manager
- Visit: https://business.facebook.com/wa/manage/message-templates/
- Select your WhatsApp Business Account

### 2. Create New Template
1. Click **"Create Template"** button
2. Fill in the details:
   - **Template Name:** `candidate_status_update`
   - **Category:** Select **"UTILITY"** (for account updates and notifications)
   - **Languages:** Select **"English"**

### 3. Build Template Content

**Header (Optional):** None

**Body (Required):**
```
Hello {{1}}, your application status has been updated to: {{2}}
```

**Add Variables:**
- Click "Add variable" button
- Variable 1: Candidate first name (e.g., "John")
- Variable 2: Status name (e.g., "Interested")

**Sample Values for Preview:**
- {{1}} = John
- {{2}} = Interested

**Footer (Optional):** 
```
Best regards, Recruitment Team
```

**Buttons (Optional):** None

### 4. Submit for Approval
1. Review the template preview
2. Click **"Submit"** button
3. Wait for Facebook approval (usually takes 1-24 hours)

### 5. After Approval
- The template will be available to use
- Your code is already configured to use this template
- Test by changing a candidate status in the system

## Testing the Template

After approval, test by:

1. **Using the test endpoint:**
```bash
curl -X POST http://localhost:3000/api/v1/whatsapp/send-template \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "YOUR_PHONE_NUMBER",
    "templateName": "candidate_status_update",
    "languageCode": "en",
    "bodyParameters": ["John", "Interested"]
  }'
```

2. **Or change a candidate status in the web app:**
   - Go to candidate detail page
   - Click the edit icon next to status
   - Change the status
   - WhatsApp message will be sent automatically

## Template Message Example

When approved and working, candidates will receive:
```
Hello John, your application status has been updated to: Interested

Best regards, Recruitment Team
```

## Fallback Behavior

If the template is not yet approved:
- System automatically falls back to sending "hello_world" message
- Check backend logs for template errors
- Once approved, the real template will be used automatically

## Template Variables

The system sends:
- **{{1}}** = First name of candidate (extracted from full name)
- **{{2}}** = Current status name (e.g., "Interested", "Qualified", "Shortlisted")

## Available Status Names

Your candidates can have these statuses:
- Untouched
- Interested
- Not Interested
- Language Barrier
- Not Reachable
- Call Back
- Wrong Number
- Ringing No Response
- Qualified
- Shortlisted
- Recommended
- Client Submitted
- Interview Scheduled
- Interview Done
- Selected
- Offered
- Joined
- Not Joined
- Rejected
- On Hold

All these will be sent as {{2}} parameter in the template.

## Troubleshooting

**Template rejected?**
- Check the category is "UTILITY" not "MARKETING"
- Ensure no promotional language
- Variables should be clearly marked
- Content should be transactional, not promotional

**Not receiving messages?**
- Check backend logs for errors
- Verify template name matches exactly: `candidate_status_update`
- Ensure template is approved (green checkmark in Business Manager)
- Check phone number format includes country code

**Template not found error?**
- System will automatically use hello_world as fallback
- Wait for template approval
- Verify template language is set to "en" (English)
