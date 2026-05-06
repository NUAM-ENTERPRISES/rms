# WhatsApp Template Creation Guide

## Step-by-Step: Create Your First Template

### Step 1: Access Facebook Business Manager
1. Go to https://business.facebook.com
2. Login with your Facebook account
3. Select your business account

### Step 2: Navigate to WhatsApp Templates
1. In the left sidebar, click **"WhatsApp Accounts"** or **"WhatsApp Manager"**
2. Click on **"Message Templates"**
3. Click **"Create Template"** button

### Step 3: Create Generic Status Update Template

#### Template Information
- **Template Name:** `candidate_status_update`
- **Category:** Select **"Utility"**
- **Languages:** Select **"English"**

#### Template Content

**Header (Optional):** Leave empty or add:
```
Status Update
```

**Body (Required):**
```
Hello {{1}},

Your candidate status has been updated to: {{2}}

{{3}}

Thank you for your patience and cooperation!

Best regards,
Affiniks RMS Team
```

**Footer (Optional):**
```
Reply STOP to opt-out
```

**Buttons (Optional):** Skip for now

**Sample Content (for approval):**
Fill in example values:
- {{1}}: `John Doe`
- {{2}}: `Qualified`
- {{3}}: `Your documents have been verified successfully.`

### Step 4: Submit for Review
1. Review your template
2. Click **"Submit"**
3. Wait for approval (usually 24-48 hours)
4. You'll get email notification when approved

---

## Template Examples

### Template 1: Generic Status Update
**Name:** `candidate_status_update`
**Use:** Fallback for all status changes

```
Hello {{1}},

Your candidate status has been updated to: {{2}}

{{3}}

Thank you for your patience!
```

Variables:
- {{1}} = Candidate Name
- {{2}} = Status Name
- {{3}} = Additional Info

---

### Template 2: Interested Status
**Name:** `candidate_status_interested`
**Use:** When candidate is marked as interested

```
Hello {{1}},

Great news! We've marked you as "Interested" for the {{2}} position.

Our recruiter will contact you within 24-48 hours with next steps.

Please keep your phone available.

Thank you!
```

Variables:
- {{1}} = Candidate Name
- {{2}} = Position/Role

---

### Template 3: Qualified Status
**Name:** `candidate_status_qualified`
**Use:** When candidate is qualified

```
Congratulations {{1}}!

You have been qualified for the {{2}} position.

Our team will reach out to you soon with further details about the next steps.

Best of luck!
```

Variables:
- {{1}} = Candidate Name
- {{2}} = Position/Role

---

### Template 4: Callback Requested
**Name:** `candidate_status_callback`
**Use:** When recruiter needs to call back

```
Hello {{1}},

We tried to reach you earlier but couldn't connect.

We've scheduled a callback for you. Please keep your phone available.

We'll contact you within the next few hours.

Thank you for your understanding!
```

Variables:
- {{1}} = Candidate Name

---

### Template 5: Not Interested
**Name:** `candidate_status_not_interested`
**Use:** When candidate is not interested

```
Hello {{1}},

We've noted that you're not interested in the current opportunity.

We appreciate your time and will keep your profile in our database for future opportunities that might interest you.

Thank you!
```

Variables:
- {{1}} = Candidate Name

---

## Template Best Practices

### ✅ Do's
- Keep messages concise (under 1024 characters)
- Use professional, friendly tone
- Include clear call-to-action when needed
- Add variables for personalization
- Include company name/branding
- Test with real data before submission

### ❌ Don'ts
- Don't use promotional language in utility templates
- Don't include too many variables (max 3-4 recommended)
- Don't use special characters excessively
- Don't promise specific timelines you can't meet
- Don't include URLs without proper formatting

---

## Template Categories

| Category | Use Case | Approval Time |
|----------|----------|---------------|
| **Utility** | Status updates, notifications | Faster (~24h) |
| **Marketing** | Promotional messages | Slower (~48h) |
| **Authentication** | OTP, verification codes | Faster (~24h) |

**Recommendation:** Use **Utility** category for candidate status updates

---

## Variable Guidelines

### Supported Variables
```
{{1}}, {{2}}, {{3}}, ... {{n}}
```

### Variable Limits
- **Body:** Up to 1024 characters
- **Header:** Up to 60 characters (if text)
- **Footer:** Up to 60 characters
- **Variables:** Unlimited, but recommended max 3-4 per template

### Variable Examples
```
Hello {{1}},                          ← Candidate name
Your status: {{2}}                    ← Status name
Project: {{3}}                        ← Project name
Next steps: {{4}}                     ← Instructions
```

---

## Approval Process

### Timeline
- **Submission:** Instant
- **Review:** 24-48 hours (typically)
- **Approval:** Email notification
- **Rejection:** Email with reasons

### Common Rejection Reasons
1. Promotional language in utility template
2. Grammatical errors or typos
3. Unclear or misleading content
4. Policy violations
5. Incomplete variable examples

### If Rejected
1. Read rejection reason in email
2. Edit template based on feedback
3. Re-submit for review
4. Wait for re-approval

---

## Quick Start Checklist

Priority order for template creation:

- [ ] 1. Test with `hello_world` (pre-approved) ✅
- [ ] 2. Create `candidate_status_update` (generic) - **START HERE**
- [ ] 3. Create `candidate_status_interested`
- [ ] 4. Create `candidate_status_qualified`
- [ ] 5. Create `candidate_status_callback`
- [ ] 6. Create other status-specific templates

---

## Template Management Tips

### Versioning
- You can't edit approved templates
- Create new version if changes needed
- Old version remains active until you deactivate

### Testing
1. Create template with test prefix: `test_candidate_status`
2. Test thoroughly
3. Delete test template
4. Create production template

### Naming Convention
```
[purpose]_[status]_[variant]

Examples:
- candidate_status_update
- candidate_status_interested
- candidate_status_qualified_v2
```

---

## Monitoring Templates

### Check Template Status
1. Go to WhatsApp Manager → Message Templates
2. Status indicators:
   - 🟢 **Approved** - Ready to use
   - 🟡 **Pending** - Under review
   - 🔴 **Rejected** - Needs revision
   - ⚫ **Disabled** - Deactivated by you

### Template Analytics
- View delivery rates
- Check read rates (if opted in)
- Monitor rejection reasons

---

## Advanced: Template with Buttons

```
Body:
Hello {{1}},

Your status: {{2}}

{{3}}

Buttons:
[Quick Reply: Confirm]
[Quick Reply: Need Help]
```

**Note:** Buttons require additional setup in code - start without buttons first.

---

## Getting Help

### Facebook Support
- WhatsApp Business Help Center
- Support chat in Business Manager
- Developer documentation

### Internal Documentation
- [WHATSAPP_INTEGRATION_GUIDE.md](WHATSAPP_INTEGRATION_GUIDE.md)
- [WHATSAPP_QUICK_REFERENCE.md](WHATSAPP_QUICK_REFERENCE.md)

---

## Example: Complete Template Submission

**Template Name:** `candidate_status_update`

**Category:** Utility

**Language:** English

**Header:** (leave empty)

**Body:**
```
Hello {{1}},

Your candidate status has been updated to: {{2}}

{{3}}

Thank you for your patience!

Best regards,
Affiniks RMS Team
```

**Footer:**
```
Reply STOP to unsubscribe
```

**Sample Values:**
- {{1}}: John Doe
- {{2}}: Qualified
- {{3}}: Your documents have been verified successfully. Our team will contact you soon.

**Submit** → Wait for approval email → Start using! 🎉

---

**Ready to create your templates? Start with `candidate_status_update` and go from there!**
