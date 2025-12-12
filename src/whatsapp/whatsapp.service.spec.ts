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
  let configService: jest.Mocked<ConfigService>;

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
                TWILIO_ACCOUNT_SID: '', // Empty to trigger DEV MODE
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
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processIncomingMessage', () => {
    const mockWebhook: TwilioWebhookDto = {
      MessageSid: 'SM123',
      AccountSid: 'AC123',
      From: 'whatsapp:+1234567890',
      To: 'whatsapp:+14155238886',
      Body: 'Hello',
    };

    it('should process incoming message and return response', async () => {
      userService.findOrCreateByPhone.mockResolvedValue(mockUser);
      conversationService.processMessage.mockResolvedValue('Welcome!');

      await service.processIncomingMessage(mockWebhook);

      expect(userService.findOrCreateByPhone).toHaveBeenCalledWith(
        'whatsapp:+1234567890',
      );
      expect(conversationService.processMessage).toHaveBeenCalledWith(
        mockUser,
        'Hello',
      );
    });

    it('should trim whitespace from message body', async () => {
      const webhookWithSpaces = { ...mockWebhook, Body: '  Hello World  ' };
      userService.findOrCreateByPhone.mockResolvedValue(mockUser);
      conversationService.processMessage.mockResolvedValue('Response');

      await service.processIncomingMessage(webhookWithSpaces);

      expect(conversationService.processMessage).toHaveBeenCalledWith(
        mockUser,
        'Hello World',
      );
    });
  });

  describe('sendMessage', () => {
    it('should log message in DEV MODE when Twilio is not configured', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendMessage('whatsapp:+1234567890', 'Test message');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEV MODE]'),
      );
    });
  });

  describe('splitMessage (private method tested via sendMessage)', () => {
    it('should not split short messages', async () => {
      const shortMessage = 'Hello';
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendMessage('whatsapp:+1234567890', shortMessage);

      // In DEV MODE, it logs the message once
      expect(loggerSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle empty messages', async () => {
      await expect(
        service.sendMessage('whatsapp:+1234567890', ''),
      ).resolves.not.toThrow();
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
                TWILIO_AUTH_TOKEN: 'test_auth_token_here',
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

  it('should initialize Twilio client when credentials are valid', () => {
    expect(service['twilioClient']).toBeDefined();
  });
});

