import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processWebhook(payload: any) {
    this.logger.log('📦 Received webhook payload from Meta:');

    // Log the full payload as a readable JSON string
    this.logger.debug(JSON.stringify(payload, null, 2));

    try {
      if (payload.object === 'page') {
        for (const entry of payload.entry || []) {
          this.logger.log(`📘 Page ID: ${entry.id}`);
          for (const change of entry.changes || []) {
            this.logger.log(`🔁 Change Field: ${change.field}`);

            if (change.field === 'leadgen') {
              const value = change.value;
              this.logger.log(`🧾 Leadgen Payload: ${JSON.stringify(value, null, 2)}`);

              const leadgenId = value?.leadgen_id || value?.lead_id || value?.id;
              const formId = value?.form_id;
              const pageId = value?.page_id || entry.id;

              if (!leadgenId) {
                this.logger.warn('⚠️ leadgen_id not present in webhook payload — cannot fetch lead details');
                continue;
              }

              try {
                const lead = await this.fetchLeadDetails(leadgenId);
                if (lead) {
                  this.logger.log(`📬 Lead fetched (id=${leadgenId}, form=${formId || 'unknown'}):`);
                  // Pretty-print core fields and field_data
                  const pretty: any = {
                    id: lead.id || leadgenId,
                    created_time: lead.created_time,
                    form_id: lead.form_id || formId,
                    ad_id: lead.ad_id,
                    field_data: Array.isArray(lead.field_data)
                      ? lead.field_data.map((f: any) => ({ name: f.name, values: f.values }))
                      : lead.field_data,
                    raw: lead,
                  };

                  this.logger.debug(JSON.stringify(pretty, null, 2));

                  // -----------------------------
                  // Persist lead and link/create candidate (idempotent & transactional)
                  // -----------------------------
                  const extract = (name: string) =>
                    (Array.isArray(lead.field_data) && lead.field_data.find((f: any) => f.name === name)?.values?.[0]) || null;

                  const fullName = extract('full_name') || extract('full-name') || extract('name') || null;
                  const emailRaw = (extract('email') || '').toString().trim().toLowerCase() || null;
                  const phoneRaw = (extract('phone_number') || extract('phone') || '').toString().trim() || null;

                  const normalizePhone = (p: string | null) => {
                    if (!p) return null;
                    const digits = p.replace(/[^0-9+]/g, '');
                    if (digits.startsWith('+')) return digits;
                    // naive fallback: if 10 digits, assume IN
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

                  // Idempotent upsert of meta lead by leadId (use `any` until Prisma client is regenerated)
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

                  // If already linked, nothing more to do (idempotent)
                  if (metaLead.candidateId) {
                    this.logger.log(`ℹ️ MetaLead ${metaLead.leadId} already linked to candidate ${metaLead.candidateId}`);
                    continue;
                  }

                  // Transactional match-or-create + link
                  await this.prisma.$transaction(async (tx) => {
                    // 1) try exact phone match (high confidence)
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

                    // 2) try email match
                    if (!candidate && email) {
                      candidate = await tx.candidate.findFirst({ where: { email } }).catch(() => null);
                    }

                    // 3) try candidate_contacts JSON search (best-effort)
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

                    // If multiple distinct candidates would match (email -> A, phone -> B), mark for review
                    if (candidate) {
                      // load existing contacts via raw query to avoid generated-client typing issues
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
                      } else {
                        this.logger.log(`ℹ️ Contact already exists on candidate ${candidate.id}`);
                      }

                      await (tx as any).metaLead.update({ where: { id: metaLead.id }, data: { candidateId: candidate.id, status: 'linked', processedAt: new Date() } });
                      return;
                    }

                    // No existing candidate found -> create new candidate (require phone to auto-create)
                    if (!phone) {
                      // do not auto-create candidates without a phone — leave for manual review/enrichment
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
                } else {
                  this.logger.warn(`⚠️ No lead data returned for leadgen_id=${leadgenId}`);
                }
              } catch (err) {
                this.logger.error(`❌ Failed to fetch lead ${leadgenId}:`, err as any);
              }
            }
          }
        }
      } else {
        this.logger.warn('⚠️ Unknown payload object type:', payload.object);
      }
    } catch (error) {
      this.logger.error('❌ Error while logging webhook data:', error);
    }
  }

  // Fetch lead details from Meta Graph API using the leadgen id.
  // Looks for an access token in environment variables: META_PAGE_ACCESS_TOKEN or FB_PAGE_ACCESS_TOKEN.
  private async fetchLeadDetails(leadgenId: string): Promise<any | null> {
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) {
      this.logger.warn('⚠️ META page access token is not set (set META_PAGE_ACCESS_TOKEN). Skipping remote fetch.');
      return null;
    }

    const version = process.env.META_GRAPH_VERSION || 'v16.0';
    const url = `https://graph.facebook.com/${version}/${encodeURIComponent(leadgenId)}?access_token=${encodeURIComponent(token)}&fields=created_time,ad_id,form_id,field_data,custom_disclaimer_responses`;

    try {
      // Use global fetch if available, otherwise try to require node-fetch as a fallback (non-fatal).
      let fetchFn: typeof fetch | null = (global as any).fetch ?? null;
      if (!fetchFn) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          fetchFn = require('node-fetch');
        } catch (_) {
          this.logger.error('❌ fetch is not available and node-fetch is not installed. Install node-fetch or run on Node 18+.');
          return null;
        }
      }

      // extra guard for TypeScript / runtime safety
      if (!fetchFn) {
        this.logger.error('❌ Unable to resolve a fetch implementation at runtime.');
        return null;
      }

      const res = await fetchFn(url, { method: 'GET' } as any);
      if (!res.ok) {
        const txt = await res.text();
        this.logger.warn(`⚠️ Graph API returned ${res.status} for lead ${leadgenId}: ${txt}`);
        return null;
      }

      const data = await res.json();
      return data;
    } catch (err) {
      this.logger.error('❌ Error while calling Meta Graph API:', err as any);
      return null;
    }
  }
}

