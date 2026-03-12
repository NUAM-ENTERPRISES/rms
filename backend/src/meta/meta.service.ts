import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { nanoid } from 'nanoid';

interface BotState {
  step: 'name' | 'email' | 'phone' | 'completed';
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  lastUpdate: number;
}

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  
  // In-memory conversation state (volatile, for PoC/MVP)
  // Key: `${platform}:${senderId}`
  private botStates = new Map<string, BotState>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Entry point for all Meta webhooks (FB Page, Instagram, WhatsApp)
   */
  async processWebhook(payload: any) {
    this.logger.debug(`📦 Webhook data: ${JSON.stringify(payload)}`);

    try {
      if (payload.object === 'page') {
        await this.handlePageWebhook(payload);
      } else if (payload.object === 'instagram') {
        await this.handleInstagramWebhook(payload);
      } else if (payload.object === 'whatsapp_business_account') {
        await this.handleWhatsAppWebhook(payload);
      } else {
        this.logger.warn(`⚠️ Unknown payload object type: ${payload.object}`);
      }
    } catch (error) {
      this.logger.error('❌ Error processing webhook payload:', error);
    }
  }

  /**
   * Handle Facebook Page events (Leadgen and Messenger)
   */
  private async handlePageWebhook(payload: any) {
    for (const entry of payload.entry || []) {
      // 1. Handle Leadgen Change Events
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            await this.handleLeadgenChange(change.value, entry.id);
          }
        }
      }

      // 2. Handle Messenger messaging events
      if (entry.messaging) {
        for (const event of entry.messaging) {
          await this.handleMessageEvent('facebook', event);
        }
      }
    }
  }

  /**
   * Handle Instagram Messaging events
   */
  private async handleInstagramWebhook(payload: any) {
    for (const entry of payload.entry || []) {
      if (entry.messaging) {
        for (const event of entry.messaging) {
          await this.handleMessageEvent('instagram', event);
        }
      }
    }
  }

  /**
   * Handle WhatsApp Cloud API events
   */
  private async handleWhatsAppWebhook(payload: any) {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const value = change.value;
          if (value.messages) {
            for (const message of value.messages) {
              await this.handleWhatsAppMessageEvent(message, value.metadata?.phone_number_id);
            }
          }
        }
      }
    }
  }

  /**
   * Common logic for Facebook & Instagram messages
   */
  private async handleMessageEvent(platform: 'facebook' | 'instagram', event: any) {
    const senderId = event.sender?.id;
    if (!senderId) return;

    // Ignore echos, reads, deliveries, and non-text messages
    if (event.message?.is_echo) {
      this.logger.debug(`[${platform}] Ignoring echo from ${senderId}`);
      return;
    }
    if (event.read || event.delivery) {
      this.logger.debug(`[${platform}] Ignoring read/delivery event from ${senderId}`);
      return;
    }
    if (!event.message?.text) {
      this.logger.debug(`[${platform}] Ignoring non-text message from ${senderId}`);
      return;
    }

    const text = event.message.text.trim();
    this.logger.log(`📩 [${platform}] Message from ${senderId}: ${text}`);

    await this.sendLeadRegistrationLink(platform, senderId);
  }

  /**
   * Specific logic for WhatsApp messages
   */
  private async handleWhatsAppMessageEvent(message: any, phoneNumberId: string) {
    const senderId = message.from; // Phone number of user
    
    // Skip message status updates (sent, delivered, read)
    if (!message.text?.body) {
      this.logger.debug(`[whatsapp] Ignoring non-text or status update from ${senderId}`);
      return;
    }

    const text = message.text.body.trim();
    this.logger.log(`📩 [whatsapp] Message from ${senderId}: ${text}`);

    await this.sendLeadRegistrationLink('whatsapp', senderId);
  }

  /**
   * Conversational state machine for gathering user details
   */
  private async runLeadCollectionFlow(platform: string, senderId: string, text: string) {
    // Deprecated for the new link-based registration flow
    return this.sendLeadRegistrationLink(platform, senderId);
  }

  /**
   * Send a secure registration link to the lead
   */
  private async sendLeadRegistrationLink(platform: string, senderId: string) {
    // Check for existing valid link in the last 24h
    const existingLead = await this.prisma.metaLead.findFirst({
      where: {
        senderId,
        platform,
        shortCode: { not: null },
        tokenExpiresAt: { gt: new Date() },
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });

    let shortCode = existingLead?.shortCode;

    if (!shortCode) {
      shortCode = nanoid(10);
      await this.prisma.metaLead.create({
        data: {
          senderId,
          platform,
          shortCode,
          tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          status: 'pending',
          source: 'meta',
        },
      });
    }

    const host = process.env.WEB_URL || 'http://localhost:5173';
    const registrationUrl = `${host}/register/${shortCode}`;

    const greeting = platform === 'whatsapp' 
      ? `*Hello from Affiniks!* 👋\n\nThank you for reaching out. To get started with your registration, please fill out our secure form here:\n\n${registrationUrl}\n\n_Note: This link will expire in 24 hours._`
      : `Hello from Affiniks! 👋 Thank you for reaching out. To get started, please fill out our secure registration form here: ${registrationUrl} (Link expires in 24 hours)`;

    await this.sendReply(platform, senderId, greeting);
  }

  /**
   * Unified reply dispatcher
   */
  private async sendReply(platform: string, recipientId: string, text: string) {
    this.logger.log(`📤 Sending reply to [${platform}:${recipientId}]: ${text}`);
    try {
      if (platform === 'facebook') {
        await this.sendFacebookMessage(recipientId, text);
      } else if (platform === 'instagram') {
        await this.sendInstagramMessage(recipientId, text);
      } else if (platform === 'whatsapp') {
        await this.sendWhatsAppMessage(recipientId, text);
      }
    } catch (err: any) {
      this.logger.error(`❌ Failed to send ${platform} reply to ${recipientId}: ${err.message}`);
      if (err.response) {
        this.logger.error(`Detailed Error: ${JSON.stringify(err.response)}`);
      }
    }
  }

  private async sendFacebookMessage(recipientId: string, text: string) {
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    const version = process.env.META_GRAPH_VERSION || 'v21.0';

    if (!token) {
      this.logger.warn('META_PAGE_ACCESS_TOKEN not set');
      throw new Error('META_PAGE_ACCESS_TOKEN is missing');
    }

    const url = `https://graph.facebook.com/${version}/me/messages?access_token=${token}`;

    try {
      await this.fetchPost(url, {
        recipient: { id: recipientId },
        message: { text },
      });
      this.logger.log(`✅ [facebook] Message sent to ${recipientId}`);
    } catch (err: any) {
      this.logger.error(`[facebook] Send failed for ${recipientId}`);
      throw err;
    }
  }

  private async sendInstagramMessage(recipientId: string, text: string) {
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    const version = process.env.META_GRAPH_VERSION || 'v21.0';

    if (!token) {
      this.logger.warn('META_PAGE_ACCESS_TOKEN not set');
      throw new Error('META_PAGE_ACCESS_TOKEN is missing for Instagram');
    }

    this.logger.debug(`Sending IG message to ${recipientId} using Page token`);

    const url = `https://graph.facebook.com/${version}/me/messages?access_token=${encodeURIComponent(token)}`;

    try {
      await this.fetchPost(url, {
        recipient: { id: recipientId },
        message: { text },
        messaging_product: 'instagram',
      });
      this.logger.log(`✅ [instagram] Message sent to ${recipientId}`);
    } catch (err: any) {
      this.logger.error(`[instagram] Send failed for ${recipientId}`);
      throw err;
    }
  }

  private async sendWhatsAppMessage(recipientId: string, text: string) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const version = process.env.META_GRAPH_VERSION || 'v21.0';

    if (!token || !phoneNumberId) {
      this.logger.warn('WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set');
      throw new Error('WhatsApp configuration missing (Token/PhoneID)');
    }

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

    try {
      await this.fetchPost(
        url,
        {
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'text',
          text: { body: text },
        },
        token,
      );
      this.logger.log(`✅ [whatsapp] Message sent to ${recipientId}`);
    } catch (err: any) {
      this.logger.error(`[whatsapp] Send failed for ${recipientId}`);
      throw err;
    }
  }

  private async fetchPost(url: string, body: any, bearerToken?: string) {
    const headers: any = { 'Content-Type': 'application/json' };
    if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorText = await res.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = errorText;
      }
      
      const error: any = new Error(`Graph API POST failed (${res.status}): ${typeof parsedError === 'string' ? parsedError : parsedError.error?.message || 'Unknown error'}`);
      error.status = res.status;
      error.response = parsedError;
      throw error;
    }
    return res.json();
  }

  /**
   * --- PUBLIC LEAD FLOW HELPERS ---
   */

  /**
   * Verify a lead short code
   */
  async verifyLeadCode(shortCode: string) {
    const lead = await this.prisma.metaLead.findUnique({
      where: { shortCode },
    });

    if (!lead) {
      throw new HttpException('Invalid registration link', HttpStatus.NOT_FOUND);
    }

    if (lead.tokenExpiresAt && new Date() > lead.tokenExpiresAt) {
      throw new HttpException('Registration link has expired', HttpStatus.GONE);
    }

    if (lead.status === 'linked' || lead.candidateId) {
      throw new HttpException('Registration already completed', HttpStatus.CONFLICT);
    }

    return {
      platform: lead.platform,
      senderId: lead.senderId,
    };
  }

  /**
   * Submit lead details and create candidate
   */
  async submitLeadDetails(shortCode: string, details: any) {
    const lead = await this.prisma.metaLead.findUnique({
      where: { shortCode },
    });

    if (!lead || (lead.tokenExpiresAt && new Date() > lead.tokenExpiresAt) || lead.status === 'linked') {
      throw new HttpException('Invalid or expired registration link', HttpStatus.BAD_REQUEST);
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create/Update Candidate
      const candidate = await tx.candidate.upsert({
        where: {
          countryCode_mobileNumber: {
            countryCode: details.countryCode,
            mobileNumber: details.mobileNumber,
          },
        },
        update: {
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          gender: details.gender,
          dateOfBirth: details.dateOfBirth ? new Date(details.dateOfBirth) : undefined,
          source: 'meta',
        },
        create: {
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          gender: details.gender,
          dateOfBirth: details.dateOfBirth ? new Date(details.dateOfBirth) : undefined,
          countryCode: details.countryCode,
          mobileNumber: details.mobileNumber,
          source: 'meta',
        },
      });

      // 2. Update MetaLead
      await tx.metaLead.update({
        where: { id: lead.id },
        data: {
          candidateId: candidate.id,
          status: 'linked',
          processedAt: new Date(),
          fullName: `${details.firstName} ${details.lastName}`,
          email: details.email,
          countryCode: details.countryCode,
          phoneNumber: details.mobileNumber,
        },
      });

      return {
        message: 'Registration successful',
        candidateId: candidate.id,
      };
    });
  }

  /**
   * --- START OF ORIGINAL LEADGEN LOGIC ---
   * (Preserved and refactored into this method)
   */
  private async handleLeadgenChange(value: any, entryId: string) {
    this.logger.log(`🧾 Leadgen Payload: ${JSON.stringify(value, null, 2)}`);

    const leadgenId = value?.leadgen_id || value?.lead_id || value?.id;
    const formId = value?.form_id;
    const pageId = value?.page_id || entryId;

    if (!leadgenId) {
      this.logger.warn('⚠️ leadgen_id not present in webhook payload — cannot fetch lead details');
      return;
    }

    try {
      const lead = await this.fetchLeadDetails(leadgenId);
      if (!lead) {
        this.logger.warn(`⚠️ No lead data returned for leadgen_id=${leadgenId}`);
        return;
      }

      this.logger.log(`📬 Lead fetched (id=${leadgenId}, form=${formId || 'unknown'}):`);
      
      const extract = (name: string) =>
        (Array.isArray(lead.field_data) && lead.field_data.find((f: any) => f.name === name)?.values?.[0]) || null;

      const fullName = extract('full_name') || extract('full-name') || extract('name') || null;
      const emailRaw = (extract('email') || '').toString().trim().toLowerCase() || null;
      const phoneRaw = (extract('phone_number') || extract('phone') || '').toString().trim() || null;

      const normalizePhone = (p: string | null) => {
        if (!p) return null;
        const digits = p.replace(/[^0-9+]/g, '');
        if (digits.startsWith('+')) return digits;
        const dd = digits.replace(/^0+/, '');
        if (dd.length === 10) return `+91${dd}`;
        return digits || null;
      };

      const splitName = (n: string | null) => {
        if (!n) return { firstName: 'Unknown', lastName: 'Unknown' };
        const parts = n.trim().split(/\s+/);
        return { firstName: parts[0] || 'Unknown', lastName: parts.slice(1).join(' ') || 'Unknown' };
      };

      const phone = normalizePhone(phoneRaw);
      const email = emailRaw;
      const countryCode = phone?.startsWith('+91') ? 'IN' : null;
      const { firstName, lastName } = splitName(fullName);

      // Idempotent upsert of meta lead
      const metaLead = await (this.prisma as any).metaLead.upsert({
        where: { leadId: lead.id },
        update: { rawPayload: lead, processedAt: new Date() },
        create: {
          leadId: lead.id,
          formId: lead.form_id,
          adId: lead.ad_id,
          fullName,
          firstName,
          lastName,
          email,
          phoneNumber: phone,
          countryCode,
          formSubmissionTime: lead.created_time ? new Date(lead.created_time) : undefined,
          rawPayload: lead,
        },
      });

      if (metaLead.candidateId) {
        this.logger.log(`ℹ️ MetaLead ${metaLead.leadId} already linked to candidate ${metaLead.candidateId}`);
        return;
      }

      // Transactional match-or-create + link
      await this.prisma.$transaction(async (tx) => {
        let candidate: any = null;

        if (phone && countryCode) {
          try {
            candidate = await tx.candidate.findUnique({
              where: { countryCode_mobileNumber: { countryCode, mobileNumber: phone.replace(/^\+/, '') } },
            });
          } catch (_) {
            candidate = null;
          }
        }

        if (!candidate && email) {
          candidate = await tx.candidate.findFirst({ where: { email } }).catch(() => null);
        }

        if (!candidate && (email || phone)) {
          const contactProbe: any = email ? { email } : { phone: phone?.replace(/^\+/, '') };
          const probeJson = JSON.stringify([contactProbe]);
          const raw = await tx.$queryRaw`
            SELECT id
            FROM candidates
            WHERE candidate_contacts @> ${probeJson}::jsonb
            LIMIT 1
          `;
          if (Array.isArray(raw) && raw.length) {
            const cid = raw[0].id as string;
            candidate = await tx.candidate.findUnique({ where: { id: cid } }).catch(() => null);
          }
        }

        if (candidate) {
          const existingRaw = await tx.$queryRaw`
            SELECT candidate_contacts
            FROM candidates
            WHERE id = ${candidate.id}
            LIMIT 1
          `;
          const existingContacts = (Array.isArray(existingRaw) && existingRaw[0]?.candidate_contacts) ? existingRaw[0].candidate_contacts : [];
          const incoming = { email: email || '', phone: phone ? phone.replace(/^\+/, '') : '' , source: 'meta', verified: false, addedAt: new Date().toISOString() };
          const duplicate = existingContacts.find((c: any) => (email && c.email === email) || (phone && c.phone === phone.replace(/^\+/, '')));
          
          if (!duplicate) {
            existingContacts.push(incoming);
            await (tx as any).candidate.update({ where: { id: candidate.id }, data: { candidateContacts: existingContacts } });
            this.logger.log(`✅ Appended new contact to candidate ${candidate.id}`);
          }

          await (tx as any).metaLead.update({ where: { id: metaLead.id }, data: { candidateId: candidate.id, status: 'linked', processedAt: new Date() } });
          return;
        }

        if (!phone) {
          await (tx as any).metaLead.update({ where: { id: metaLead.id }, data: { status: 'pending', processingNote: 'no_phone_present' } });
          this.logger.log(`⚠️ Skipping auto-create for metaLead ${metaLead.leadId} (no phone)`);
          return;
        }

        const created = await (tx as any).candidate.create({
          data: {
            firstName: firstName || 'Unknown',
            lastName: lastName || 'Unknown',
            email: email || undefined,
            countryCode: countryCode || 'IN',
            mobileNumber: phone.replace(/^\+/, ''),
            source: 'meta',
            candidateContacts: [
              { email: email || '', phone: phone.replace(/^\+/, ''), source: 'meta', verified: false, addedAt: new Date().toISOString() },
            ],
          },
        });

        await (tx as any).metaLead.update({ where: { id: metaLead.id }, data: { candidateId: created.id, status: 'linked', processedAt: new Date() } });
        this.logger.log(`🆕 Created candidate ${created.id} from meta lead ${metaLead.leadId}`);
      });
    } catch (err) {
      this.logger.error(`❌ Failed to fetch/process lead ${leadgenId}:`, err);
    }
  }

  private async fetchLeadDetails(leadgenId: string): Promise<any | null> {
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) {
      this.logger.warn('⚠️ META page access token is not set. Skipping remote fetch.');
      return null;
    }

    const version = process.env.META_GRAPH_VERSION || 'v16.0';
    const url = `https://graph.facebook.com/${version}/${encodeURIComponent(leadgenId)}?access_token=${encodeURIComponent(token)}&fields=created_time,ad_id,form_id,field_data,custom_disclaimer_responses`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text();
        this.logger.warn(`⚠️ Graph API returned ${res.status} for lead ${leadgenId}: ${txt}`);
        return null;
      }
      return await res.json();
    } catch (err) {
      this.logger.error('❌ Error while calling Meta Graph API:', err as any);
      return null;
    }
  }
}
