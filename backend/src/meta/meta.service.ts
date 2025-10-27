import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

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
}
