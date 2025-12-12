import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';

describe('WhatsappController', () => {
  let controller: WhatsappController;
  let whatsappService: jest.Mocked<WhatsappService>;

  const mockResponse = (): Partial<Response> => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [
        {
          provide: WhatsappService,
          useValue: {
            processIncomingMessage: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_verify_token'),
          },
        },
      ],
    }).compile();

    controller = module.get<WhatsappController>(WhatsappController);
    whatsappService = module.get(WhatsappService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyWebhook', () => {
    describe('mode argument', () => {
      it('should accept "subscribe" mode', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', 'test_verify_token', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith('challenge');
      });

      it('should reject "unsubscribe" mode', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('unsubscribe', 'test_verify_token', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should reject empty mode', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('', 'test_verify_token', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should reject null mode', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook(null as any, 'test_verify_token', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should reject undefined mode', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook(undefined as any, 'test_verify_token', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should reject random string mode', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('random_mode', 'test_verify_token', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should be case-sensitive for mode', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('Subscribe', 'test_verify_token', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });
    });

    describe('token argument', () => {
      it('should accept matching token', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', 'test_verify_token', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should reject non-matching token', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', 'wrong_token', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should reject empty token', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', '', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should reject null token', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', null as any, 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should reject undefined token', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', undefined as any, 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should reject token with extra spaces', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', ' test_verify_token ', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });

      it('should be case-sensitive for token', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', 'TEST_VERIFY_TOKEN', 'challenge', res);

        expect(res.status).toHaveBeenCalledWith(403);
      });
    });

    describe('challenge argument', () => {
      it('should return challenge string on success', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', 'test_verify_token', 'my_challenge_123', res);

        expect(res.send).toHaveBeenCalledWith('my_challenge_123');
      });

      it('should return numeric challenge', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', 'test_verify_token', '1234567890', res);

        expect(res.send).toHaveBeenCalledWith('1234567890');
      });

      it('should return long challenge string', () => {
        const res = mockResponse() as Response;
        const longChallenge = 'a'.repeat(100);

        controller.verifyWebhook('subscribe', 'test_verify_token', longChallenge, res);

        expect(res.send).toHaveBeenCalledWith(longChallenge);
      });

      it('should return challenge with special characters', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', 'test_verify_token', 'chal-lenge_123.abc', res);

        expect(res.send).toHaveBeenCalledWith('chal-lenge_123.abc');
      });

      it('should return empty challenge', () => {
        const res = mockResponse() as Response;

        controller.verifyWebhook('subscribe', 'test_verify_token', '', res);

        expect(res.send).toHaveBeenCalledWith('');
      });
    });
  });

  describe('handleIncomingMessage', () => {
    describe('body.MessageSid argument', () => {
      it('should accept standard Twilio SID format', async () => {
        const res = mockResponse() as Response;
        const body: TwilioWebhookDto = {
          MessageSid: 'SM1234567890abcdef1234567890abcdef',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+0987654321',
          Body: 'Hello',
        };

        whatsappService.processIncomingMessage.mockResolvedValue();

        await controller.handleIncomingMessage(body, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should accept short SID', async () => {
        const res = mockResponse() as Response;
        const body: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+0987654321',
          Body: 'Hello',
        };

        whatsappService.processIncomingMessage.mockResolvedValue();

        await controller.handleIncomingMessage(body, res);

        expect(whatsappService.processIncomingMessage).toHaveBeenCalledWith(body);
      });
    });

    describe('body.From argument', () => {
      it('should accept whatsapp format', async () => {
        const res = mockResponse() as Response;
        const body: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+0987654321',
          Body: 'Hello',
        };

        whatsappService.processIncomingMessage.mockResolvedValue();

        await controller.handleIncomingMessage(body, res);

        expect(whatsappService.processIncomingMessage).toHaveBeenCalledWith(
          expect.objectContaining({ From: 'whatsapp:+1234567890' }),
        );
      });

      it('should accept international format', async () => {
        const res = mockResponse() as Response;
        const body: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+44207946000',
          To: 'whatsapp:+0987654321',
          Body: 'Hello',
        };

        whatsappService.processIncomingMessage.mockResolvedValue();

        await controller.handleIncomingMessage(body, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });
    });

    describe('body.Body argument', () => {
      it('should handle empty body', async () => {
        const res = mockResponse() as Response;
        const body: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+0987654321',
          Body: '',
        };

        whatsappService.processIncomingMessage.mockResolvedValue();

        await controller.handleIncomingMessage(body, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should handle unicode body', async () => {
        const res = mockResponse() as Response;
        const body: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+0987654321',
          Body: '你好 🌟 مرحبا',
        };

        whatsappService.processIncomingMessage.mockResolvedValue();

        await controller.handleIncomingMessage(body, res);

        expect(whatsappService.processIncomingMessage).toHaveBeenCalledWith(
          expect.objectContaining({ Body: '你好 🌟 مرحبا' }),
        );
      });

      it('should handle very long body', async () => {
        const res = mockResponse() as Response;
        const body: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+0987654321',
          Body: 'A'.repeat(10000),
        };

        whatsappService.processIncomingMessage.mockResolvedValue();

        await controller.handleIncomingMessage(body, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });
    });

    describe('error handling', () => {
      it('should return 200 even when processing fails', async () => {
        const res = mockResponse() as Response;
        const body: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+0987654321',
          Body: 'Hello',
        };

        whatsappService.processIncomingMessage.mockRejectedValue(new Error('Processing failed'));

        await controller.handleIncomingMessage(body, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should return 200 on timeout error', async () => {
        const res = mockResponse() as Response;
        const body: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+0987654321',
          Body: 'Hello',
        };

        whatsappService.processIncomingMessage.mockRejectedValue(new Error('Timeout'));

        await controller.handleIncomingMessage(body, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should return 200 on database error', async () => {
        const res = mockResponse() as Response;
        const body: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+0987654321',
          Body: 'Hello',
        };

        whatsappService.processIncomingMessage.mockRejectedValue(new Error('Database connection failed'));

        await controller.handleIncomingMessage(body, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });
    });
  });

  describe('handleStatusCallback', () => {
    describe('body.MessageStatus argument', () => {
      const statuses = ['queued', 'sent', 'delivered', 'read', 'failed', 'undelivered'];

      statuses.forEach((status) => {
        it(`should handle "${status}" status`, async () => {
          const res = mockResponse() as Response;

          await controller.handleStatusCallback({ MessageSid: 'SM123', MessageStatus: status }, res);

          expect(res.status).toHaveBeenCalledWith(200);
        });
      });
    });

    describe('body.MessageSid argument', () => {
      it('should accept standard SID', async () => {
        const res = mockResponse() as Response;

        await controller.handleStatusCallback({
          MessageSid: 'SM1234567890abcdef',
          MessageStatus: 'delivered',
        }, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should accept any SID format', async () => {
        const res = mockResponse() as Response;

        await controller.handleStatusCallback({
          MessageSid: 'any_sid_123',
          MessageStatus: 'delivered',
        }, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });
    });

    describe('body with error info', () => {
      it('should handle failed status with error code', async () => {
        const res = mockResponse() as Response;

        await controller.handleStatusCallback({
          MessageSid: 'SM123',
          MessageStatus: 'failed',
          ErrorCode: '30001',
          ErrorMessage: 'Message delivery failed',
        }, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('should handle undelivered status with error code', async () => {
        const res = mockResponse() as Response;

        await controller.handleStatusCallback({
          MessageSid: 'SM123',
          MessageStatus: 'undelivered',
          ErrorCode: '30003',
        }, res);

        expect(res.status).toHaveBeenCalledWith(200);
      });
    });
  });
});
