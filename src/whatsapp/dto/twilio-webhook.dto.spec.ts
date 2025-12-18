import { validate } from 'class-validator';
import { TwilioWebhookDto } from './twilio-webhook.dto';

describe('TwilioWebhookDto', () => {
  it('should create a valid DTO', () => {
    const dto = new TwilioWebhookDto();
    dto.MessageSid = 'SM123456789';
    dto.AccountSid = 'AC123456789';
    dto.From = 'whatsapp:+1234567890';
    dto.To = 'whatsapp:+0987654321';
    dto.Body = 'Hello World';

    expect(dto.MessageSid).toBe('SM123456789');
    expect(dto.AccountSid).toBe('AC123456789');
    expect(dto.From).toBe('whatsapp:+1234567890');
    expect(dto.To).toBe('whatsapp:+0987654321');
    expect(dto.Body).toBe('Hello World');
  });

  it('should allow optional fields', () => {
    const dto = new TwilioWebhookDto();
    dto.MessageSid = 'SM123';
    dto.AccountSid = 'AC123';
    dto.From = 'whatsapp:+1234567890';
    dto.To = 'whatsapp:+0987654321';
    dto.Body = 'Test';
    dto.NumMedia = '0';
    dto.ProfileName = 'John Doe';
    dto.WaId = '1234567890';

    expect(dto.NumMedia).toBe('0');
    expect(dto.ProfileName).toBe('John Doe');
    expect(dto.WaId).toBe('1234567890');
  });

  it('should pass validation with required fields', async () => {
    const dto = new TwilioWebhookDto();
    dto.MessageSid = 'SM123456789';
    dto.AccountSid = 'AC123456789';
    dto.From = 'whatsapp:+1234567890';
    dto.To = 'whatsapp:+0987654321';
    dto.Body = 'Hello';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation without MessageSid', async () => {
    const dto = new TwilioWebhookDto();
    dto.AccountSid = 'AC123456789';
    dto.From = 'whatsapp:+1234567890';
    dto.To = 'whatsapp:+0987654321';
    dto.Body = 'Hello';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('MessageSid');
  });

  it('should fail validation without From', async () => {
    const dto = new TwilioWebhookDto();
    dto.MessageSid = 'SM123456789';
    dto.AccountSid = 'AC123456789';
    dto.To = 'whatsapp:+0987654321';
    dto.Body = 'Hello';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation without Body', async () => {
    const dto = new TwilioWebhookDto();
    dto.MessageSid = 'SM123456789';
    dto.AccountSid = 'AC123456789';
    dto.From = 'whatsapp:+1234567890';
    dto.To = 'whatsapp:+0987654321';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should handle empty body string', async () => {
    const dto = new TwilioWebhookDto();
    dto.MessageSid = 'SM123456789';
    dto.AccountSid = 'AC123456789';
    dto.From = 'whatsapp:+1234567890';
    dto.To = 'whatsapp:+0987654321';
    dto.Body = '';

    const errors = await validate(dto);
    // Empty string is still a valid string
    expect(errors.length).toBe(0);
  });

  it('should handle media messages', () => {
    const dto = new TwilioWebhookDto();
    dto.MessageSid = 'SM123456789';
    dto.AccountSid = 'AC123456789';
    dto.From = 'whatsapp:+1234567890';
    dto.To = 'whatsapp:+0987654321';
    dto.Body = '';
    dto.NumMedia = '1';

    expect(dto.NumMedia).toBe('1');
  });
});







