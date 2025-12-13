import { Controller, Post, Body, Get, Query, Res, Logger, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';

@Controller('webhook')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Health check endpoint to verify ngrok connectivity
   */
  @Get('health')
  healthCheck() {
    this.logger.log('✅ Health check received - ngrok connection verified!');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Natal Bot is connected and ready to receive messages',
    };
  }

  /**
   * Webhook verification endpoint (for Meta WhatsApp Business API)
   */
  @Get('whatsapp')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.configService.get<string>('WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Webhook verified successfully');
      return res.status(HttpStatus.OK).send(challenge);
    }

    this.logger.warn('Webhook verification failed');
    return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
  }

  /**
   * Incoming message webhook (Twilio)
   */
  @Post('whatsapp')
  async handleIncomingMessage(@Body() body: TwilioWebhookDto, @Res() res: Response) {
    this.logger.log('═══════════════════════════════════════════════════════');
    this.logger.log('📩 TWILIO WEBHOOK RECEIVED');
    this.logger.log(`   From: ${body.From}`);
    this.logger.log(`   To: ${body.To}`);
    this.logger.log(`   Message: "${body.Body}"`);
    this.logger.log(`   MessageSid: ${body.MessageSid}`);
    this.logger.log('═══════════════════════════════════════════════════════');

    try {
      // Process message asynchronously
      await this.whatsappService.processIncomingMessage(body);

      // Twilio expects empty 200 response
      return res.status(HttpStatus.OK).send();
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);
      return res.status(HttpStatus.OK).send(); // Still return 200 to prevent retries
    }
  }

  /**
   * Status callback endpoint (Twilio)
   */
  @Post('whatsapp/status')
  async handleStatusCallback(@Body() body: any, @Res() res: Response) {
    this.logger.debug(`Message status update: ${body.MessageSid} - ${body.MessageStatus}`);
    return res.status(HttpStatus.OK).send();
  }
}
