# WhatsApp Integration - Quick Reference

## 🚀 Getting Started (5 Minutes)

### 1. Enable WhatsApp
Your `.env` file is already configured:
```env
WHATSAPP_ENABLED=true
WHATSAPP_PHONE_NUMBER_ID=949404321591561
WHATSAPP_ACCESS_TOKEN=EAAT04LSIz8g... (already set)
```

### 2. Test It Now
```bash
# Start backend
cd backend
npm run start:dev

# In another terminal, test WhatsApp
curl -X POST http://localhost:3000/whatsapp/test/hello-world \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "91YOUR_NUMBER"}'
```

### 3. Create Templates
Go to: https://business.facebook.com → WhatsApp Manager → Message Templates

**Minimum Required Template:**
- **Name:** `candidate_status_update`
- **Category:** Utility
- **Body:** `Hello {{1}}, Your status: {{2}}. {{3}}`

## 📞 How It Works Now

**Before:**
```
User updates candidate status → Database updated → Done
```

**After:**
```
User updates candidate status → Database updated → WhatsApp sent to candidate ✅
```

## 🔧 API Endpoints

### Test WhatsApp
```http
POST /whatsapp/test/hello-world
Body: { "phoneNumber": "919876543210" }
```

### Update Candidate Status (Auto-sends WhatsApp)
```http
PATCH /candidates/{id}/status
Body: { 
  "currentStatusId": 9,
  "reason": "Qualified after interview"
}
```

## 📱 Phone Number Format

✅ **Correct:** `919876543210` (country code + number, no spaces)
❌ **Wrong:** `+91 98765 43210`, `9876543210`

The system pulls from:
- `candidate.countryCode` (e.g., "91")
- `candidate.mobileNumber` (e.g., "9876543210")

## 🎯 What Templates to Create

### Priority 1: Must Have
```
candidate_status_update (generic fallback)
```

### Priority 2: Nice to Have
```
candidate_status_interested
candidate_status_qualified
candidate_status_callback
candidate_status_not_interested
```

## 🔍 Debugging

### Check if WhatsApp is working
```bash
# Look for these in backend logs:
[WhatsAppService] WhatsApp service initialized successfully ✅
[WhatsAppService] Sending WhatsApp message to 919876543210...
[WhatsAppService] WhatsApp message sent successfully. Message ID: wamid.xxx ✅
```

### Common Issues

| Error | Solution |
|-------|----------|
| "WhatsApp is disabled" | Set `WHATSAPP_ENABLED=true` in `.env` |
| "Invalid OAuth access token" | Token expired, regenerate in Facebook |
| "Template does not exist" | Create template in Facebook Business Manager |
| "Invalid phone number" | Check candidate has countryCode + mobileNumber |

## 🎨 Status → Template Mapping

| Candidate Status | WhatsApp Template Used |
|------------------|------------------------|
| Interested | `candidate_status_interested` |
| Qualified | `candidate_status_qualified` |
| Call Back | `candidate_status_callback` |
| Not Interested | `candidate_status_not_interested` |
| Others | `candidate_status_update` (fallback) |

## 📊 Files Changed

**Backend:**
- ✅ `backend/src/whatsapp/*` (new module)
- ✅ `backend/src/candidates/candidates.service.ts` (+ WhatsApp logic)
- ✅ `backend/src/candidates/candidates.module.ts` (+ WhatsApp import)
- ✅ `backend/src/app.module.ts` (+ WhatsApp module)
- ✅ `backend/.env` (+ WhatsApp config)

**Frontend (Optional):**
- ✅ `web/src/features/settings/views/WhatsAppSettings.tsx` (admin UI)

**Docs:**
- ✅ `WHATSAPP_INTEGRATION_GUIDE.md` (full documentation)
- ✅ `WHATSAPP_IMPLEMENTATION_SUMMARY.md` (implementation details)

## 🚨 Important Notes

### Access Token
- ⚠️ Current token is **temporary** (expires soon)
- 📝 Generate **permanent token** via System Users for production
- 🔒 Never commit tokens to Git

### Message Limits
- 🆓 First 1000 conversations/month are free
- 💰 After that, charges apply
- 📊 Monitor usage in Facebook Business Suite

### Templates
- ⏱️ Approval takes 24-48 hours
- ✅ Start with `hello_world` (pre-approved)
- 📋 Create `candidate_status_update` next

## 🎓 Learning Resources

- [Full Guide](WHATSAPP_INTEGRATION_GUIDE.md) - Detailed setup instructions
- [Implementation](WHATSAPP_IMPLEMENTATION_SUMMARY.md) - Technical details
- [Facebook Docs](https://developers.facebook.com/docs/whatsapp/cloud-api) - Official API docs

## 💡 Pro Tips

1. **Test First:** Use `hello_world` template to verify connection
2. **Logs are Your Friend:** Always check backend logs
3. **Start Simple:** Use generic template, add specific ones later
4. **Non-Blocking:** WhatsApp errors won't break status updates
5. **Disable Anytime:** Set `WHATSAPP_ENABLED=false` to pause

## 🎉 Success Checklist

- [x] ✅ Backend code implemented
- [x] ✅ Environment variables set
- [ ] ⏳ Test with hello_world template
- [ ] ⏳ Create candidate_status_update template
- [ ] ⏳ Get permanent access token
- [ ] ⏳ Test real status update → WhatsApp flow

---

**Need Help?** Check [WHATSAPP_INTEGRATION_GUIDE.md](WHATSAPP_INTEGRATION_GUIDE.md) for troubleshooting!
