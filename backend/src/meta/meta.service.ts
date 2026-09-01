import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { nanoid } from 'nanoid';
import { RecruiterAssignmentService } from '../candidates/services/recruiter-assignment.service';
import { CandidateCodeService } from '../candidates/services/candidate-code.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { CANDIDATE_STATUS } from '../common/constants/statuses';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly recruiterAssignmentService: RecruiterAssignmentService,
    private readonly candidateCodeService: CandidateCodeService,
    private readonly notificationsService: NotificationsService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  private async resolveDefaultProfessionTypeId(
    tx: Pick<PrismaService, 'professionType'>,
  ): Promise<string> {
    const professionType = await tx.professionType.findFirst({
      where: { name: 'nurse', isActive: true },
      select: { id: true },
    });
    if (!professionType) {
      throw new Error('Default profession type (nurse) is not configured');
    }
    return professionType.id;
  }

  private async resolveUntouchedStatus(
    tx: Pick<PrismaService, 'candidateStatus'>,
  ): Promise<{ id: number; statusName: string }> {
    const untouchedStatus = await tx.candidateStatus.findFirst({
      where: {
        statusName: {
          equals: CANDIDATE_STATUS.UNTOUCHED,
          mode: 'insensitive',
        },
      },
      select: { id: true, statusName: true },
    });
    if (!untouchedStatus) {
      throw new Error('Candidate status (Untouched) is not configured');
    }
    return untouchedStatus;
  }

  private async createInitialMetaStatusHistory(
    tx: Pick<PrismaService, 'candidateStatusHistory'>,
    candidateId: string,
    untouchedStatus: { id: number; statusName: string },
  ): Promise<void> {
    await tx.candidateStatusHistory.create({
      data: {
        candidateId,
        statusId: untouchedStatus.id,
        statusNameSnapshot: untouchedStatus.statusName,
        changedByName: 'System',
        reason: 'Initial candidate creation via Meta Lead',
        notificationCount: 0,
        statusUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Entry point for all Meta webhooks (FB Page, Instagram, WhatsApp)
   */
  async processWebhook(payload: any) {
    this.logger.debug(`📦 Webhook data: ${JSON.stringify(payload)}`);

    try {
      const channels = await this.systemConfigService.getLeadgenChannelsSettings();

      if (payload.object === 'page') {
        if (!channels.messenger && !channels.leadgenForms) {
          this.logger.warn(
            '⚠️ Messenger and Meta Leadgen are both disabled — skipping page webhook',
          );
          return;
        }
        await this.handlePageWebhook(payload, channels);
      } else if (payload.object === 'instagram') {
        if (!channels.instagram) {
          this.logger.warn(
            '⚠️ Instagram leadgen is disabled — skipping instagram webhook',
          );
          return;
        }
        await this.handleInstagramWebhook(payload);
      } else if (payload.object === 'whatsapp_business_account') {
        if (!channels.whatsapp) {
          this.logger.warn(
            '⚠️ WhatsApp leadgen is disabled — skipping whatsapp webhook',
          );
          return;
        }
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
  private async handlePageWebhook(
    payload: any,
    channels: { messenger: boolean; leadgenForms: boolean },
  ) {
    for (const entry of payload.entry || []) {
      // 1. Handle Leadgen Change Events (Meta Lead Ads forms)
      if (channels.leadgenForms && entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            await this.handleLeadgenChange(change.value, entry.id);
          }
        }
      } else if (!channels.leadgenForms && entry.changes) {
        const hasLeadgen = (entry.changes || []).some(
          (change: any) => change.field === 'leadgen',
        );
        if (hasLeadgen) {
          this.logger.warn(
            '⚠️ Meta Leadgen (Lead Ads forms) is disabled — skipping leadgen events',
          );
        }
      }

      // 2. Handle Messenger messaging events
      if (channels.messenger && entry.messaging) {
        for (const event of entry.messaging) {
          await this.handleMessageEvent('facebook', event);
        }
      } else if (!channels.messenger && entry.messaging) {
        this.logger.warn(
          '⚠️ Messenger is disabled — skipping messaging events',
        );
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

    if (platform === 'whatsapp') {
      await this.sendWhatsAppInteractiveButton(senderId, registrationUrl);
    } else if (platform === 'facebook' || platform === 'instagram') {
      await this.sendMessengerButton(platform, senderId, registrationUrl);
    } else {
      const greeting = `Hello from Affiniks! 👋 To get started, please fill out our secure registration form here: ${registrationUrl}`;
      await this.sendReply(platform, senderId, greeting);
    }
  }

  /**
   * Send WhatsApp Interactive Button
   */
  private async sendWhatsAppInteractiveButton(recipientId: string, url: string) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const version = process.env.META_GRAPH_VERSION || 'v21.0';

    if (!token || !phoneNumberId) throw new Error('WhatsApp config missing');

    const graphUrl = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientId,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        header: {
          type: 'text',
          text: 'Registration Required',
        },
        body: {
          text: 'Welcome to Affiniks! 👋\n\nPlease tap the button below to complete your registration on our secure portal.',
        },
        footer: {
          text: 'This link expires in 24 hours.',
        },
        action: {
          name: 'cta_url',
          parameters: {
            display_text: 'Register Here',
            url: url,
          },
        },
      },
    };

    await this.fetchPost(graphUrl, body, token);
  }

  /**
   * Send Facebook/Instagram Messenger Button
   */
  private async sendMessengerButton(platform: 'facebook' | 'instagram', recipientId: string, url: string) {
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    const version = process.env.META_GRAPH_VERSION || 'v21.0';

    if (!token) throw new Error('Meta Page token missing');

    const graphUrl = `https://graph.facebook.com/${version}/me/messages?access_token=${token}`;

    const body = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [
              {
                title: 'Affiniks Registration',
                subtitle: 'Connecting Talent with Opportunity',
                image_url: 'https://affiniks.com/wp-content/uploads/2021/08/logo.png', // Placeholder logo
                buttons: [
                  {
                    type: 'web_url',
                    url: url,
                    title: 'Register Now',
                    webview_height_ratio: 'full',
                  },
                ],
              },
            ],
          },
        },
      },
      ...(platform === 'instagram' ? { messaging_product: 'instagram' } : {}),
    };

    await this.fetchPost(graphUrl, body);
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
   * Find an existing candidate by phone (preferred) or email.
   * Phone is unique; email is not — use most recently updated match.
   */
  private async findExistingCandidateByContact(details: {
    countryCode?: string;
    mobileNumber?: string;
    email?: string;
  }) {
    if (details.countryCode && details.mobileNumber) {
      const byPhone = await this.prisma.candidate.findUnique({
        where: {
          countryCode_mobileNumber: {
            countryCode: details.countryCode,
            mobileNumber: details.mobileNumber,
          },
        },
        select: { id: true, firstName: true, lastName: true },
      });
      if (byPhone) {
        return byPhone;
      }
    }

    if (details.email) {
      return this.prisma.candidate.findFirst({
        where: {
          email: { equals: details.email, mode: 'insensitive' },
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, firstName: true, lastName: true },
      });
    }

    return null;
  }

  private formatRecruiterPhone(recruiter: {
    mobileNumber?: string | null;
    countryCode?: string | null;
    email?: string | null;
  }): string {
    if (recruiter.mobileNumber) {
      return `${recruiter.countryCode || ''} ${recruiter.mobileNumber}`.trim();
    }
    return recruiter.email || '';
  }

  /**
   * Duplicate Meta registration: link lead, notify handling recruiter, reply on WA/IG/Messenger.
   */
  private async handleDuplicateRegistration(
    lead: {
      id: string;
      platform: string | null;
      senderId: string | null;
      shortCode: string | null;
    },
    existing: { id: string; firstName: string; lastName: string | null },
    details: any,
  ): Promise<never> {
    await this.prisma.metaLead.update({
      where: { id: lead.id },
      data: {
        candidateId: existing.id,
        status: 'linked',
        processedAt: new Date(),
        fullName: `${details.firstName} ${details.lastName}`,
        email: details.email,
        countryCode: details.countryCode,
        phoneNumber: details.mobileNumber,
      },
    });

    const assignment = await this.prisma.candidateRecruiterAssignment.findFirst({
      where: {
        candidateId: existing.id,
        isActive: true,
      },
      include: {
        recruiter: {
          select: {
            id: true,
            name: true,
            email: true,
            countryCode: true,
            mobileNumber: true,
          },
        },
      },
    });

    const recruiter = assignment?.recruiter;
    const recruiterPhone = recruiter
      ? this.formatRecruiterPhone(recruiter)
      : undefined;
    const assignedRecruiter = recruiter
      ? {
          name: recruiter.name,
          email: recruiter.email,
          phone: recruiterPhone,
        }
      : undefined;

    const candidateDisplayName =
      `${existing.firstName} ${existing.lastName}`.trim() ||
      `${details.firstName} ${details.lastName}`.trim();

    if (recruiter) {
      try {
        await this.notificationsService.createNotification({
          userId: recruiter.id,
          type: 'meta_reregistration',
          title: 'Candidate registered again',
          message: `${candidateDisplayName} registered once more`,
          link: `/candidates/${existing.id}`,
          meta: {
            candidateId: existing.id,
            shortCode: lead.shortCode,
            source: 'meta',
          },
          idemKey: `meta-rereg-${existing.id}-${lead.shortCode}`,
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to notify recruiter ${recruiter.id} about Meta re-registration: ${err.message}`,
        );
      }
    }

    const alreadyMsg = recruiter
      ? `Your data is already in Affiniks. You are handled by *${recruiter.name}*. Contact: ${recruiterPhone}.`
      : 'Your data is already in Affiniks. Our team will contact you shortly.';

    if (lead.platform && lead.senderId) {
      await this.sendReply(
        lead.platform as string,
        lead.senderId as string,
        alreadyMsg,
      );
    }

    throw new HttpException(
      {
        code: 'ALREADY_REGISTERED',
        message: 'Your data is already in Affiniks',
        candidateId: existing.id,
        ...(assignedRecruiter ? { assignedRecruiter } : {}),
      },
      HttpStatus.CONFLICT,
    );
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

    const existing = await this.findExistingCandidateByContact(details);
    if (existing) {
      await this.handleDuplicateRegistration(lead, existing, details);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const dateOfBirth = details.dateOfBirth
        ? new Date(details.dateOfBirth)
        : undefined;

      const untouchedStatus = await this.resolveUntouchedStatus(tx);

      const candidate = await tx.candidate.create({
        data: {
          candidateCode: await this.candidateCodeService.reserveNextCode(tx),
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          gender: details.gender,
          dateOfBirth,
          countryCode: details.countryCode,
          mobileNumber: details.mobileNumber,
          source: 'meta',
          professionTypeId: await this.resolveDefaultProfessionTypeId(tx),
          currentStatusId: untouchedStatus.id,
        },
      });

      await this.createInitialMetaStatusHistory(
        tx,
        candidate.id,
        untouchedStatus,
      );

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
        candidateId: candidate.id,
      };
    });

    // Assign Recruiter (Round-Robin)
    const systemAdmin = await this.prisma.user.findFirst({
        where: {
            userRoles: {
                some: {
                    role: {
                        name: {
                            contains: 'Admin',
                            mode: 'insensitive'
                        }
                    }
                }
            }
        }
    });

    const recruiter = await this.recruiterAssignmentService.assignRecruiterToCandidate(
      result.candidateId,
      systemAdmin?.id || 'system',
      'Automatic assignment via Meta Lead registration'
    );

    const recruiterPhone = this.formatRecruiterPhone(recruiter);
    const confirmationMsg = `Registration successful! ✅\n\nYour assigned recruiter is *${recruiter.name}*. They will contact you shortly at this number or via email.\n\nRecruiter Contact: ${recruiterPhone}`;
    
    if (lead.platform && lead.senderId) {
      await this.sendReply(lead.platform as string, lead.senderId as string, confirmationMsg);
    }

    return {
      message: 'Registration successful',
      candidateId: result.candidateId,
      assignedRecruiter: {
        name: recruiter.name,
        email: recruiter.email,
        phone: recruiterPhone,
      }
    };
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

        const untouchedStatus = await this.resolveUntouchedStatus(tx);

        const created = await (tx as any).candidate.create({
          data: {
            candidateCode: await this.candidateCodeService.reserveNextCode(tx),
            firstName: firstName || 'Unknown',
            lastName: lastName || 'Unknown',
            email: email || undefined,
            countryCode: countryCode || 'IN',
            mobileNumber: phone.replace(/^\+/, ''),
            source: 'meta',
            professionTypeId: await this.resolveDefaultProfessionTypeId(tx),
            currentStatusId: untouchedStatus.id,
            candidateContacts: [
              { email: email || '', phone: phone.replace(/^\+/, ''), source: 'meta', verified: false, addedAt: new Date().toISOString() },
            ],
          },
        });

        await this.createInitialMetaStatusHistory(
          tx,
          created.id,
          untouchedStatus,
        );

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

  private buildMetaLeadsBaseWhere(query: {
    status?: string;
    search?: string;
  }): Record<string, unknown> {
    const and: Record<string, unknown>[] = [{ erasedAt: null }];

    if (query.status) {
      and.push({ status: query.status });
    }

    const search = query.search?.trim();
    if (search) {
      and.push({
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } },
          { leadId: { contains: search, mode: 'insensitive' } },
          { shortCode: { contains: search, mode: 'insensitive' } },
          { senderId: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    return { AND: and };
  }

  private buildMetaLeadsPlatformWhere(
    platform?: string,
  ): Record<string, unknown> | null {
    const normalized = platform?.trim().toLowerCase();
    if (!normalized || normalized === 'all') {
      return null;
    }

    // Lead Ads forms typically store no messaging platform (null / "meta").
    if (normalized === 'meta') {
      return {
        OR: [
          { platform: null },
          { platform: { equals: 'meta', mode: 'insensitive' } },
        ],
      };
    }

    // Messenger inbound messages are stored as platform = "facebook".
    if (normalized === 'messenger' || normalized === 'facebook') {
      return {
        platform: { equals: 'facebook', mode: 'insensitive' },
      };
    }

    return {
      platform: { equals: normalized, mode: 'insensitive' },
    };
  }

  /**
   * Admin: paginated MetaLead history
   */
  async listMetaLeads(query: {
    page?: number;
    limit?: number;
    status?: string;
    platform?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limitRaw = Number(query.limit ?? 20);
    const limit = Math.min(100, Math.max(1, limitRaw));
    const skip = (page - 1) * limit;

    const baseWhere = this.buildMetaLeadsBaseWhere(query);
    const platformWhere = this.buildMetaLeadsPlatformWhere(query.platform);
    const where = platformWhere
      ? { AND: [baseWhere, platformWhere] }
      : baseWhere;

    const [
      total,
      rows,
      totalCount,
      metaCount,
      instagramCount,
      messengerCount,
      whatsappCount,
    ] = await Promise.all([
      this.prisma.metaLead.count({ where }),
      this.prisma.metaLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          leadId: true,
          formId: true,
          fullName: true,
          firstName: true,
          lastName: true,
          email: true,
          countryCode: true,
          phoneNumber: true,
          status: true,
          platform: true,
          source: true,
          shortCode: true,
          senderId: true,
          candidateId: true,
          processingNote: true,
          formSubmissionTime: true,
          createdAt: true,
          processedAt: true,
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              candidateCode: true,
            },
          },
        },
      }),
      this.prisma.metaLead.count({ where: baseWhere }),
      this.prisma.metaLead.count({
        where: {
          AND: [baseWhere, this.buildMetaLeadsPlatformWhere('meta')!],
        },
      }),
      this.prisma.metaLead.count({
        where: {
          AND: [baseWhere, this.buildMetaLeadsPlatformWhere('instagram')!],
        },
      }),
      this.prisma.metaLead.count({
        where: {
          AND: [baseWhere, this.buildMetaLeadsPlatformWhere('messenger')!],
        },
      }),
      this.prisma.metaLead.count({
        where: {
          AND: [baseWhere, this.buildMetaLeadsPlatformWhere('whatsapp')!],
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        ...row,
        displayName:
          row.fullName ||
          [row.firstName, row.lastName].filter(Boolean).join(' ') ||
          null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      platformCounts: {
        total: totalCount,
        meta: metaCount,
        instagram: instagramCount,
        messenger: messengerCount,
        whatsapp: whatsappCount,
      },
    };
  }
}
