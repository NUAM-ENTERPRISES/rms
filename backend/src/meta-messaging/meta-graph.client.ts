import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MetaGraphClient {
  private readonly logger = new Logger(MetaGraphClient.name);

  constructor(private readonly configService: ConfigService) {}

  getGraphVersion(): string {
    return this.configService.get<string>('META_GRAPH_VERSION') || 'v21.0';
  }

  getPageAccessToken(): string | undefined {
    return this.configService.get<string>('META_PAGE_ACCESS_TOKEN');
  }

  getWhatsAppAccessToken(): string | undefined {
    const whatsapp = this.configService.get<{ accessToken?: string }>('whatsapp');
    return whatsapp?.accessToken || this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
  }

  getWhatsAppPhoneNumberId(): string | undefined {
    const whatsapp = this.configService.get<{ phoneNumberId?: string }>('whatsapp');
    return (
      whatsapp?.phoneNumberId || this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID')
    );
  }

  async post(
    url: string,
    body: Record<string, unknown>,
    bearerToken?: string,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let parsedError: unknown;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = errorText;
      }

      const errorMessage =
        typeof parsedError === 'string'
          ? parsedError
          : (parsedError as { error?: { message?: string } })?.error?.message ||
            'Unknown error';

      const error = new Error(
        `Graph API POST failed (${res.status}): ${errorMessage}`,
      ) as Error & { status?: number; response?: unknown };
      error.status = res.status;
      error.response = parsedError;
      this.logger.error(error.message);
      throw error;
    }

    return res.json();
  }
}
