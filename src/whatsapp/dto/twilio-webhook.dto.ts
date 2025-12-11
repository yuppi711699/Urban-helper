import { IsString, IsOptional } from 'class-validator';

export class TwilioWebhookDto {
  @IsString()
  MessageSid: string;

  @IsString()
  AccountSid: string;

  @IsString()
  From: string;

  @IsString()
  To: string;

  @IsString()
  Body: string;

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


