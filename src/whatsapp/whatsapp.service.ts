import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { UserService } from '../user/user.service';
import { ConversationService } from '../conversation/conversation.service';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private twilioClient: Twilio | null = null;
  private fromNumber: string = '';

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly conversationService: ConversationService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    // Twilio accountSid must start with 'AC' - skip if placeholder/invalid
    if (accountSid?.startsWith('AC') && authToken && authToken.length > 10) {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.fromNumber = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER', '');
      this.logger.log('Twilio client initialized');
    } else {
      this.logger.warn('Twilio credentials not configured - running in DEV MODE');
    }
  }

  /**
   * Process incoming WhatsApp message
   */
  async processIncomingMessage(webhook: TwilioWebhookDto): Promise<void> {
    const phoneNumber = webhook.From;
    const messageText = webhook.Body.trim();

    this.logger.log(`Processing message from ${phoneNumber}: "${messageText}"`);

    // Find or create user
    const user = await this.userService.findOrCreateByPhone(phoneNumber);

    // Process through conversation state machine
    const response = await this.conversationService.processMessage(
      user,
      messageText,
    );

    // Send response back to user
    await this.sendMessage(phoneNumber, response);
  }

  /**
   * Send WhatsApp message via Twilio
   */
  async sendMessage(to: string, body: string): Promise<void> {
    if (!this.twilioClient) {
      this.logger.warn(`[DEV MODE] Would send to ${to}: ${body}`);
      return;
    }

    try {
      // Split long messages (WhatsApp has ~4096 char limit but best practice is ~1600)
      const messages = this.splitMessage(body, 1500);

      for (const msg of messages) {
        await this.twilioClient.messages.create({
          body: msg,
          from: this.fromNumber,
          to: to,
        });
      }

      this.logger.log(`Message sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Split long messages into chunks
   */
  private splitMessage(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const messages: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        messages.push(remaining);
        break;
      }

      // Find last newline or space within limit
      let splitIndex = remaining.lastIndexOf('\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        splitIndex = remaining.lastIndexOf(' ', maxLength);
      }
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        splitIndex = maxLength;
      }

      messages.push(remaining.substring(0, splitIndex).trim());
      remaining = remaining.substring(splitIndex).trim();
    }

    return messages;
  }
}

