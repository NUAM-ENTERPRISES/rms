# WhatsApp Integration for Candidate Status Updates

## Overview
This document describes the WhatsApp integration implementation for sending automatic notifications to candidates when their status changes in the RMS system.

## Architecture

### Backend Components

1. **WhatsAppService** (`backend/src/whatsapp/whatsapp.service.ts`)
   - Handles communication with Facebook Graph API
   - Sends template-based WhatsApp messages
   - Validates phone numbers
   - Maps candidate statuses to WhatsApp templates

2. **WhatsAppModule** (`backend/src/whatsapp/whatsapp.module.ts`)
   - Exports WhatsAppService for use in other modules
   - Integrates with ConfigModule for environment variables

3. **WhatsAppController** (`backend/src/whatsapp/whatsapp.controller.ts`)
   - Provides test endpoints for WhatsApp integration
   - Allows manual template message sending

### Integration Points

The WhatsApp integration is triggered automatically when:
- Candidate status is updated via `PATCH /candidates/:id/status`
- The candidate has a valid phone number (countryCode + mobileNumber)
- WhatsApp is enabled (`WHATSAPP_ENABLED=true`)

## Environment Variables

Add these to your `.env` file:

```env
# WhatsApp Integration
WHATSAPP_ENABLED=true
WHATSAPP_PHONE_NUMBER_ID=949404321591561
WHATSAPP_ACCESS_TOKEN=your-access-token-here
```

### Getting WhatsApp Credentials

1. **Create Facebook Business Account**
   - Go to [Facebook Business](https://business.facebook.com)
   - Create a new business account or use existing

2. **Set up WhatsApp Business API**
   - Go to [Meta for Developers](https://developers.facebook.com)
   - Create a new app or use existing
   - Add "WhatsApp" product to your app
   - Complete the setup wizard

3. **Get Phone Number ID**
   - In WhatsApp > API Setup
   - Copy the "Phone number ID" (e.g., 949404321591561)

4. **Get Access Token**
   - In WhatsApp > API Setup > Temporary access token (for testing)
   - For production: Generate a permanent access token via System Users

## WhatsApp Message Templates

WhatsApp requires pre-approved message templates. You must create these in Facebook Business Manager.

### Template Setup in Facebook Business Manager

1. Navigate to: **WhatsApp Manager > Message Templates**
2. Click "Create Template"
3. Fill in template details (see templates below)
4. Submit for approval (usually takes 24-48 hours)

### Required Templates

#### 1. Generic Status Update Template
**Template Name**: `candidate_status_update`
**Category**: Utility
**Language**: English

```
Hello {{1}},

Your candidate status has been updated to: {{2}}

{{3}}

Thank you for your patience!
```

**Parameters**:
- {{1}} = Candidate Name
- {{2}} = Status Name
- {{3}} = Additional Information/Reason (optional)

#### 2. Status-Specific Templates (Optional)

You can create specific templates for each status for better personalization:

**Template Name**: `candidate_status_interested`
```
Hello {{1}},

Great news! We've marked you as "Interested" for the position.

Our recruiter will contact you shortly with next steps.

Thank you!
```

**Template Name**: `candidate_status_qualified`
```
Congratulations {{1}}!

You have been qualified for the position. Our team will reach out to you soon with further details.

Best of luck!
```

**Template Name**: `candidate_status_not_interested`
```
Hello {{1}},

We've noted that you're not interested in this opportunity at the moment.

We appreciate your time and will keep your profile for future opportunities.

Thank you!
```

**Template Name**: `candidate_status_callback`
```
Hello {{1}},

We tried to reach you earlier. We've scheduled a callback.

Please keep your phone available. We'll contact you soon.

Thank you!
```

### Testing Template (Already Available)

**Template Name**: `hello_world`
```
Hello World
```

Use this for initial testing without parameters.

## API Endpoints

### Test WhatsApp Integration

```bash
POST /whatsapp/test/hello-world
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "919876543210"
}
```

### Send Custom Template

```bash
POST /whatsapp/send-template
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "919876543210",
  "templateName": "candidate_status_update",
  "languageCode": "en",
  "bodyParameters": ["John Doe", "Qualified", "Your documents have been verified"]
}
```

## Phone Number Format

Phone numbers must be in international format without special characters:
- ✅ Correct: `919876543210` (country code + number)
- ❌ Wrong: `+91 98765 43210`, `+91-9876543210`, `9876543210`

The system automatically:
1. Validates phone numbers using `countryCode` and `mobileNumber` from candidate record
2. Formats them correctly for WhatsApp API
3. Skips notification if phone number is invalid

## Status to Template Mapping

The system maps candidate statuses to templates as follows:

| Status Name | Template Name |
|-------------|---------------|
| Untouched | `candidate_status_untouched` |
| Interested | `candidate_status_interested` |
| Not Interested | `candidate_status_not_interested` |
| Language Barrier | `candidate_status_language_barrier` |
| Not Reachable | `candidate_status_not_reachable` |
| Call Back | `candidate_status_callback` |
| Wrong Number | `candidate_status_wrong_number` |
| Ringing No Response | `candidate_status_rnr` |
| Qualified | `candidate_status_qualified` |
| All Others | `candidate_status_update` (generic) |

You can customize this mapping in `whatsapp.service.ts` in the `getTemplateForStatus()` method.

## Workflow

1. **Status Update Triggered**
   - User updates candidate status via API or web interface
   - `CandidatesService.updateStatus()` is called

2. **Status Change Processing**
   - Candidate status updated in database
   - Status history record created
   - RNR reminders handled if applicable

3. **WhatsApp Notification**
   - Phone number validated and formatted
   - Template name determined based on status
   - Message sent asynchronously (non-blocking)
   - Success/failure logged

4. **Error Handling**
   - If WhatsApp is disabled, notification is skipped
   - If phone number is invalid, notification is skipped
   - If API call fails, error is logged but status update succeeds

## Monitoring and Logging

All WhatsApp operations are logged:

```
[WhatsAppService] WhatsApp service initialized successfully
[CandidatesService] Sending WhatsApp notification to candidate clx123... (919876543210) for status change to Qualified
[WhatsAppService] Sending WhatsApp message to 919876543210 with template: candidate_status_qualified
[WhatsAppService] WhatsApp message sent successfully to 919876543210. Message ID: wamid.xxx
```

Check backend logs for:
- Message send attempts
- Success/failure status
- API errors
- Invalid phone numbers

## Error Handling

### Common Errors

1. **Invalid Access Token**
```json
{
  "error": {
    "message": "Invalid OAuth access token",
    "type": "OAuthException",
    "code": 190
  }
}
```
**Solution**: Regenerate access token in Facebook Business Manager

2. **Template Not Found**
```json
{
  "error": {
    "message": "Template does not exist in the translation",
    "type": "InvalidParameterException",
    "code": 100
  }
}
```
**Solution**: Create and approve the template in WhatsApp Manager

3. **Invalid Phone Number**
```json
{
  "error": {
    "message": "Invalid parameter: to",
    "type": "InvalidParameterException"
  }
}
```
**Solution**: Ensure phone number is in correct format (country code + number)

## Production Considerations

1. **Rate Limits**
   - Facebook enforces rate limits on WhatsApp API
   - Default: 1000 messages per day (can be increased)
   - Monitor usage in WhatsApp Manager

2. **Message Costs**
   - WhatsApp charges for business-initiated conversations
   - First 1000 conversations per month are free
   - Check current pricing in Meta Business Suite

3. **Access Token Management**
   - Use System User tokens for production
   - Store securely (environment variables, secrets manager)
   - Rotate tokens periodically
   - Never commit tokens to version control

4. **Template Approval**
   - Templates require approval before use
   - Plan template creation ahead of launch
   - Have fallback to generic template

5. **Opt-out Handling**
   - Respect user preferences (future enhancement)
   - Add opt-out mechanism if required by regulations
   - Consider adding a database field for WhatsApp opt-in/opt-out

## Future Enhancements

1. **Template Management UI**
   - Web interface to manage template mappings
   - Preview templates before sending

2. **Delivery Status Tracking**
   - Implement webhooks for delivery receipts
   - Track read receipts
   - Store delivery status in database

3. **User Preferences**
   - Allow candidates to opt-in/opt-out of WhatsApp notifications
   - Preferred notification channels

4. **Rich Media**
   - Support for images, documents in templates
   - Interactive buttons for actions

5. **Multi-language Support**
   - Detect candidate language preference
   - Send templates in appropriate language

## Testing

### Local Testing

1. Enable WhatsApp:
```env
WHATSAPP_ENABLED=true
```

2. Test with hello_world template:
```bash
curl -X POST http://localhost:3000/whatsapp/test/hello-world \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "YOUR_PHONE_NUMBER"}'
```

3. Update candidate status and check logs:
```bash
curl -X PATCH http://localhost:3000/candidates/{id}/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"currentStatusId": 9, "reason": "Test notification"}'
```

### Disable in Development

To disable WhatsApp notifications during development:
```env
WHATSAPP_ENABLED=false
```

## Troubleshooting

1. **Messages not sending**
   - Check WHATSAPP_ENABLED is true
   - Verify access token is valid
   - Check backend logs for errors
   - Verify phone number format

2. **Template errors**
   - Ensure template is approved
   - Check template name spelling
   - Verify parameter count matches

3. **Phone number validation fails**
   - Ensure candidate has both countryCode and mobileNumber
   - Check data format in database

## Support and Documentation

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- [Facebook Business Manager](https://business.facebook.com)
- [Meta for Developers](https://developers.facebook.com)
