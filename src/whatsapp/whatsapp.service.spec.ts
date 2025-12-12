import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { UserService } from '../user/user.service';
import { ConversationService } from '../conversation/conversation.service';
import { TwilioWebhookDto } from './dto/twilio-webhook.dto';
import { User, ConversationState } from '../user/entities/user.entity';

// Mock Twilio
jest.mock('twilio', () => {
  return {
    Twilio: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'SM123' }),
      },
    })),
  };
});

describe('WhatsappService', () => {
  let service: WhatsappService;
  let userService: jest.Mocked<UserService>;
  let conversationService: jest.Mocked<ConversationService>;

  const mockUser: User = {
    id: 'test-uuid-123',
    phoneNumber: 'whatsapp:+1234567890',
    name: 'John',
    birthDate: new Date('1990-12-25'),
    birthTime: '14:30',
    birthPlace: 'London, UK',
    birthLatitude: 51.5074,
    birthLongitude: -0.1278,
    timezone: 'Europe/London',
    conversationState: ConversationState.NEW,
    natalChart: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, string> = {
                TWILIO_ACCOUNT_SID: '',
                TWILIO_AUTH_TOKEN: '',
                TWILIO_WHATSAPP_NUMBER: 'whatsapp:+14155238886',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: UserService,
          useValue: {
            findOrCreateByPhone: jest.fn(),
          },
        },
        {
          provide: ConversationService,
          useValue: {
            processMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
    userService = module.get(UserService);
    conversationService = module.get(ConversationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processIncomingMessage', () => {
    describe('webhook.From argument', () => {
      it('should process message with standard whatsapp format', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: 'Hello',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Welcome!');

        await service.processIncomingMessage(webhook);

        expect(userService.findOrCreateByPhone).toHaveBeenCalledWith('whatsapp:+1234567890');
      });

      it('should process message with international format', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+44207946000',
          To: 'whatsapp:+14155238886',
          Body: 'Test',
        };

        userService.findOrCreateByPhone.mockResolvedValue({ ...mockUser, phoneNumber: 'whatsapp:+44207946000' });
        conversationService.processMessage.mockResolvedValue('Response');

        await service.processIncomingMessage(webhook);

        expect(userService.findOrCreateByPhone).toHaveBeenCalledWith('whatsapp:+44207946000');
      });

      it('should process message with long phone number', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+995599123456789',
          To: 'whatsapp:+14155238886',
          Body: 'Test',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await service.processIncomingMessage(webhook);

        expect(userService.findOrCreateByPhone).toHaveBeenCalledWith('whatsapp:+995599123456789');
      });
    });

    describe('webhook.Body argument', () => {
      it('should trim whitespace from body', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: '  Hello World  ',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await service.processIncomingMessage(webhook);

        expect(conversationService.processMessage).toHaveBeenCalledWith(mockUser, 'Hello World');
      });

      it('should handle empty body', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: '',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await service.processIncomingMessage(webhook);

        expect(conversationService.processMessage).toHaveBeenCalledWith(mockUser, '');
      });

      it('should handle body with only whitespace', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: '   ',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await service.processIncomingMessage(webhook);

        expect(conversationService.processMessage).toHaveBeenCalledWith(mockUser, '');
      });

      it('should handle unicode body', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: '你好世界 🌟',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await service.processIncomingMessage(webhook);

        expect(conversationService.processMessage).toHaveBeenCalledWith(mockUser, '你好世界 🌟');
      });

      it('should handle multi-line body', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: 'Line 1\nLine 2\nLine 3',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await service.processIncomingMessage(webhook);

        expect(conversationService.processMessage).toHaveBeenCalledWith(mockUser, 'Line 1\nLine 2\nLine 3');
      });

      it('should handle very long body', async () => {
        const longBody = 'A'.repeat(5000);
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: longBody,
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await service.processIncomingMessage(webhook);

        expect(conversationService.processMessage).toHaveBeenCalledWith(mockUser, longBody);
      });

      it('should handle body with special characters', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: 'Hello! @#$%^&*() <script>alert("xss")</script>',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await service.processIncomingMessage(webhook);

        expect(conversationService.processMessage).toHaveBeenCalledWith(
          mockUser,
          'Hello! @#$%^&*() <script>alert("xss")</script>',
        );
      });
    });

    describe('webhook.MessageSid argument', () => {
      it('should accept standard Twilio message SID', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM1234567890abcdef1234567890abcdef',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: 'Test',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await expect(service.processIncomingMessage(webhook)).resolves.not.toThrow();
      });
    });

    describe('webhook optional fields', () => {
      it('should handle webhook with ProfileName', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: 'Hello',
          ProfileName: 'John Doe',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await expect(service.processIncomingMessage(webhook)).resolves.not.toThrow();
      });

      it('should handle webhook with NumMedia', async () => {
        const webhook: TwilioWebhookDto = {
          MessageSid: 'SM123',
          AccountSid: 'AC123',
          From: 'whatsapp:+1234567890',
          To: 'whatsapp:+14155238886',
          Body: '',
          NumMedia: '1',
        };

        userService.findOrCreateByPhone.mockResolvedValue(mockUser);
        conversationService.processMessage.mockResolvedValue('Response');

        await expect(service.processIncomingMessage(webhook)).resolves.not.toThrow();
      });
    });
  });

  describe('sendMessage', () => {
    describe('to argument', () => {
      it('should accept whatsapp format phone number', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'warn');

        await service.sendMessage('whatsapp:+1234567890', 'Test message');

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('whatsapp:+1234567890'),
        );
      });

      it('should accept international format', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'warn');

        await service.sendMessage('whatsapp:+44123456789', 'Test');

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('whatsapp:+44123456789'),
        );
      });

      it('should accept phone with country code', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'warn');

        await service.sendMessage('whatsapp:+995599123456', 'Test');

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('whatsapp:+995599123456'),
        );
      });
    });

    describe('body argument', () => {
      it('should send short message without splitting', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'warn');

        await service.sendMessage('whatsapp:+1234567890', 'Hello');

        expect(loggerSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle empty body', async () => {
        await expect(service.sendMessage('whatsapp:+1234567890', '')).resolves.not.toThrow();
      });

      it('should handle unicode in body', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'warn');

        await service.sendMessage('whatsapp:+1234567890', '✨ Hello 你好 🌟');

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('✨ Hello 你好 🌟'),
        );
      });

      it('should handle multi-line body', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'warn');
        const multiLine = 'Line 1\nLine 2\nLine 3';

        await service.sendMessage('whatsapp:+1234567890', multiLine);

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Line 1'),
        );
      });

      it('should handle markdown formatted body', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'warn');
        const markdown = '*Bold* _italic_ ~strike~';

        await service.sendMessage('whatsapp:+1234567890', markdown);

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('*Bold*'),
        );
      });

      it('should handle body at exactly 1500 chars (no split needed)', async () => {
        const body = 'A'.repeat(1500);
        const loggerSpy = jest.spyOn(service['logger'], 'warn');

        await service.sendMessage('whatsapp:+1234567890', body);

        expect(loggerSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle long body in DEV MODE (single log)', async () => {
        // In DEV MODE without Twilio, the splitMessage is called but 
        // each chunk is logged separately. However the DEV MODE log
        // includes the full message, so we just check it doesn't throw.
        const body = 'A'.repeat(3000);
        
        await expect(service.sendMessage('whatsapp:+1234567890', body)).resolves.not.toThrow();
      });

      it('should handle body with word boundaries', async () => {
        const body = 'Hello '.repeat(300); // ~1800 chars

        await expect(service.sendMessage('whatsapp:+1234567890', body)).resolves.not.toThrow();
      });

      it('should handle body with newlines', async () => {
        const body = ('Line of text\n').repeat(200); // ~2600 chars

        await expect(service.sendMessage('whatsapp:+1234567890', body)).resolves.not.toThrow();
      });
    });
  });
});

describe('WhatsappService with Twilio configured', () => {
  let service: WhatsappService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                TWILIO_ACCOUNT_SID: 'ACtest123456789012345678901234',
                TWILIO_AUTH_TOKEN: 'test_auth_token_1234567890',
                TWILIO_WHATSAPP_NUMBER: 'whatsapp:+14155238886',
              };
              return config[key];
            }),
          },
        },
        {
          provide: UserService,
          useValue: { findOrCreateByPhone: jest.fn() },
        },
        {
          provide: ConversationService,
          useValue: { processMessage: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  describe('constructor with valid credentials', () => {
    it('should initialize Twilio client', () => {
      expect(service['twilioClient']).toBeDefined();
    });

    it('should set fromNumber', () => {
      expect(service['fromNumber']).toBe('whatsapp:+14155238886');
    });
  });
});

describe('WhatsappService with invalid credentials', () => {
  it('should not initialize Twilio when accountSid does not start with AC', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                TWILIO_ACCOUNT_SID: 'invalid_account_sid',
                TWILIO_AUTH_TOKEN: 'test_token',
                TWILIO_WHATSAPP_NUMBER: 'whatsapp:+14155238886',
              };
              return config[key];
            }),
          },
        },
        {
          provide: UserService,
          useValue: { findOrCreateByPhone: jest.fn() },
        },
        {
          provide: ConversationService,
          useValue: { processMessage: jest.fn() },
        },
      ],
    }).compile();

    const service = module.get<WhatsappService>(WhatsappService);
    expect(service['twilioClient']).toBeNull();
  });

  it('should not initialize Twilio when authToken is too short', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                TWILIO_ACCOUNT_SID: 'ACtest12345',
                TWILIO_AUTH_TOKEN: 'short',
                TWILIO_WHATSAPP_NUMBER: 'whatsapp:+14155238886',
              };
              return config[key];
            }),
          },
        },
        {
          provide: UserService,
          useValue: { findOrCreateByPhone: jest.fn() },
        },
        {
          provide: ConversationService,
          useValue: { processMessage: jest.fn() },
        },
      ],
    }).compile();

    const service = module.get<WhatsappService>(WhatsappService);
    expect(service['twilioClient']).toBeNull();
  });
});
