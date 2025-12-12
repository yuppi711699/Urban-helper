import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';

describe('WhatsappController', () => {
  let controller: WhatsappController;
  let whatsappService: jest.Mocked<WhatsappService>;
  let configService: jest.Mocked<ConfigService>;

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
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyWebhook', () => {
    it('should return challenge when verification succeeds', () => {
      const res = mockResponse() as Response;

      controller.verifyWebhook(
        'subscribe',
        'test_verify_token',
        'challenge_123',
        res,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('challenge_123');
    });

    it('should return 403 when mode is not subscribe', () => {
      const res = mockResponse() as Response;

      controller.verifyWebhook(
        'unsubscribe',
        'test_verify_token',
        'challenge_123',
        res,
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Verification failed');
    });

    it('should return 403 when token does not match', () => {
      const res = mockResponse() as Response;

      controller.verifyWebhook(
        'subscribe',
        'wrong_token',
        'challenge_123',
        res,
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Verification failed');
    });

    it('should return 403 when token is missing', () => {
      const res = mockResponse() as Response;

      controller.verifyWebhook('subscribe', undefined as any, 'challenge_123', res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('handleIncomingMessage', () => {
    const mockWebhook: TwilioWebhookDto = {
      MessageSid: 'SM123',
      AccountSid: 'AC123',
      From: 'whatsapp:+1234567890',
      To: 'whatsapp:+14155238886',
      Body: 'Hello',
    };

    it('should process message and return 200', async () => {
      const res = mockResponse() as Response;
      whatsappService.processIncomingMessage.mockResolvedValue();

      await controller.handleIncomingMessage(mockWebhook, res);

      expect(whatsappService.processIncomingMessage).toHaveBeenCalledWith(
        mockWebhook,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 200 even when processing fails (to prevent Twilio retries)', async () => {
      const res = mockResponse() as Response;
      whatsappService.processIncomingMessage.mockRejectedValue(
        new Error('Processing failed'),
      );

      await controller.handleIncomingMessage(mockWebhook, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('handleStatusCallback', () => {
    it('should return 200 for delivered status', async () => {
      const res = mockResponse() as Response;
      const statusBody = {
        MessageSid: 'SM123',
        MessageStatus: 'delivered',
      };

      await controller.handleStatusCallback(statusBody, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 200 for read status', async () => {
      const res = mockResponse() as Response;
      const statusBody = {
        MessageSid: 'SM123',
        MessageStatus: 'read',
      };

      await controller.handleStatusCallback(statusBody, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 200 for failed status', async () => {
      const res = mockResponse() as Response;
      const statusBody = {
        MessageSid: 'SM123',
        MessageStatus: 'failed',
        ErrorCode: '30001',
      };

      await controller.handleStatusCallback(statusBody, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});

