import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { MetaService } from './meta.service';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('meta/webhook')
export class MetaController {
    private readonly logger = new Logger(MetaController.name);
    private readonly VERIFY_TOKEN = 'my_secret_token_123';

    constructor(private readonly metaService: MetaService) { }

    @Public()
    @Get()
    verifyWebhook(@Query() query: any): string {
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];

        this.logger.log('🔍 Webhook verification attempt:', query);

        if (mode && token === this.VERIFY_TOKEN) {
            this.logger.log('✅ Webhook verified successfully!');
            return challenge;
        } else {
            this.logger.error('❌ Verification failed - invalid verify token');
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }
    }

    @Public()
    @Post()
    async handleWebhook(@Body() body: any): Promise<string> {
        this.logger.log(
            `📩 Webhook event received: ${JSON.stringify(body, null, 2)}`
        );

        try {
            await this.metaService.processWebhook(body);
        } catch (err) {
            this.logger.error('❌ Error processing webhook:', err);
        }

        return 'OK';
    }

}
