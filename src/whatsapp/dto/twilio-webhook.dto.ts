import { IsString, IsOptional } from 'class-validator';

/**
 * Twilio WhatsApp webhook payload
 * @see https://www.twilio.com/docs/messaging/guides/webhook-request
 */
export class TwilioWebhookDto {
  @IsString()
  MessageSid: string;

  @IsString()
  From: string;

  @IsString()
  To: string;

  @IsString()
  Body: string;

  @IsOptional()
  @IsString()
  AccountSid?: string;

  @IsOptional()
  @IsString()
  NumMedia?: string;

  @IsOptional()
  @IsString()
  ProfileName?: string;

  @IsOptional()
  @IsString()
  WaId?: string;
}
