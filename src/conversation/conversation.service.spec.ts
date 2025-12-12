import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationService } from './conversation.service';
import { Message, MessageRole } from './entities/message.entity';
import { UserService } from '../user/user.service';
import { AstrologyService } from '../astrology/astrology.service';
import { AiService } from '../ai/ai.service';
import { User, ConversationState } from '../user/entities/user.entity';
import { NatalChart } from '../astrology/entities/natal-chart.entity';

describe('ConversationService', () => {
  let service: ConversationService;
  let messageRepository: jest.Mocked<Repository<Message>>;
  let userService: jest.Mocked<UserService>;
  let astrologyService: jest.Mocked<AstrologyService>;
  let aiService: jest.Mocked<AiService>;

  const mockNatalChart: NatalChart = {
    id: 'chart-uuid',
    user: null as any,
    planets: [],
    houses: [],
    aspects: [],
    sunSign: 'Capricorn',
    moonSign: 'Aries',
    ascendant: 'Leo',
    rawApiResponse: '{}',
    aiInterpretation: 'Test interpretation',
    lifeStoryNarrative: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockUser = (state: ConversationState, hasChart = false): User => ({
    id: 'test-uuid-123',
    phoneNumber: 'whatsapp:+1234567890',
    name: 'John',
    birthDate: new Date('1990-12-25'),
    birthTime: '14:30',
    birthPlace: 'London, UK',
    birthLatitude: 51.5074,
    birthLongitude: -0.1278,
    timezone: 'Europe/London',
    conversationState: state,
    natalChart: hasChart ? mockNatalChart : (null as any),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: getRepositoryToken(Message),
          useValue: {
            create: jest.fn().mockImplementation((msg) => msg),
            save: jest.fn().mockImplementation((msg) => Promise.resolve({ ...msg, id: 'msg-id' })),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: UserService,
          useValue: {
            updateState: jest.fn(),
            updateBirthInfo: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: AstrologyService,
          useValue: {
            geocodeLocation: jest.fn(),
            generateNatalChart: jest.fn(),
          },
        },
        {
          provide: AiService,
          useValue: {
            interpretNatalChart: jest.fn(),
            getPersonalizedAdvice: jest.fn(),
            getDailyHoroscope: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    messageRepository = module.get(getRepositoryToken(Message));
    userService = module.get(UserService);
    astrologyService = module.get(AstrologyService);
    aiService = module.get(AiService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processMessage', () => {
    describe('user argument', () => {
      it('should process user with NEW state', async () => {
        const user = createMockUser(ConversationState.NEW);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, 'Hello');

        expect(result).toContain('Welcome');
      });

      it('should process user with null name', async () => {
        const user = { ...createMockUser(ConversationState.CHATTING, true), name: null as any };

        const result = await service.processMessage(user, 'menu');

        expect(result).toBeDefined();
      });

      it('should process user with empty name', async () => {
        const user = { ...createMockUser(ConversationState.CHATTING, true), name: '' };

        const result = await service.processMessage(user, 'menu');

        expect(result).toBeDefined();
      });

      it('should process user with undefined natalChart', async () => {
        const user = createMockUser(ConversationState.CHATTING);
        user.natalChart = undefined as any;

        const result = await service.processMessage(user, 'my chart');

        expect(result).toContain('No chart found');
      });
    });

    describe('messageText argument in NEW state', () => {
      it('should accept any greeting', async () => {
        const user = createMockUser(ConversationState.NEW);
        userService.updateState.mockResolvedValue(user);

        const greetings = ['Hello', 'Hi', 'Hey', 'Start', 'Begin', ''];
        for (const greeting of greetings) {
          const result = await service.processMessage(user, greeting);
          expect(result).toContain('Welcome');
        }
      });
    });

    describe('messageText argument in AWAITING_NAME state', () => {
      it('should accept simple name', async () => {
        const user = createMockUser(ConversationState.AWAITING_NAME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, 'John');

        expect(result).toContain('Nice to meet you');
        expect(result).toContain('John');
      });

      it('should accept name with spaces', async () => {
        const user = createMockUser(ConversationState.AWAITING_NAME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, 'John Doe');

        expect(result).toContain('John Doe');
      });

      it('should accept hyphenated name', async () => {
        const user = createMockUser(ConversationState.AWAITING_NAME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, 'Mary-Jane');

        expect(result).toContain('Mary-Jane');
      });

      it('should accept name with apostrophe', async () => {
        const user = createMockUser(ConversationState.AWAITING_NAME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, "O'Connor");

        expect(result).toContain("O'Connor");
      });

      it('should accept cyrillic name', async () => {
        const user = createMockUser(ConversationState.AWAITING_NAME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, 'Иван');

        expect(result).toContain('Иван');
      });

      it('should reject single character name', async () => {
        const user = createMockUser(ConversationState.AWAITING_NAME);

        const result = await service.processMessage(user, 'A');

        expect(result).toContain('valid name');
      });

      it('should reject empty name', async () => {
        const user = createMockUser(ConversationState.AWAITING_NAME);

        const result = await service.processMessage(user, '');

        expect(result).toContain('valid name');
      });

      it('should strip numbers from name', async () => {
        const user = createMockUser(ConversationState.AWAITING_NAME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        await service.processMessage(user, 'John123');

        expect(userService.updateBirthInfo).toHaveBeenCalledWith(user.id, { name: 'John' });
      });
    });

    describe('messageText argument in AWAITING_BIRTH_DATE state', () => {
      it('should accept DD/MM/YYYY format', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '25/12/1990');

        expect(result).toContain('Birth date saved');
      });

      it('should accept DD-MM-YYYY format', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '25-12-1990');

        expect(result).toContain('Birth date saved');
      });

      it('should accept DD.MM.YYYY format', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '25.12.1990');

        expect(result).toContain('Birth date saved');
      });

      it('should accept single digit day', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '5/12/1990');

        expect(result).toContain('Birth date saved');
      });

      it('should accept single digit month', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '25/6/1990');

        expect(result).toContain('Birth date saved');
      });

      it('should reject invalid format', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);

        const result = await service.processMessage(user, 'December 25, 1990');

        expect(result).toContain('Invalid date format');
      });

      it('should reject future date', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);

        const result = await service.processMessage(user, '25/12/2099');

        expect(result).toContain('cannot be in the future');
      });

      it('should reject date before 1900', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);

        const result = await service.processMessage(user, '25/12/1850');

        expect(result).toContain('after 1900');
      });

      it('should reject impossible date Feb 31', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);

        const result = await service.processMessage(user, '31/02/1990');

        expect(result).toContain("doesn't seem to be a valid date");
      });

      it('should reject month 13', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);

        const result = await service.processMessage(user, '25/13/1990');

        expect(result).toContain("doesn't seem to be a valid date");
      });

      it('should accept leap year Feb 29', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_DATE);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '29/02/2000');

        expect(result).toContain('Birth date saved');
      });
    });

    describe('messageText argument in AWAITING_BIRTH_TIME state', () => {
      it('should accept HH:MM format', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_TIME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '14:30');

        expect(result).toContain('Birth time saved');
        expect(result).toContain('14:30');
      });

      it('should accept midnight 00:00', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_TIME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '00:00');

        expect(result).toContain('00:00');
      });

      it('should accept 23:59', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_TIME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '23:59');

        expect(result).toContain('23:59');
      });

      it('should accept single digit hour', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_TIME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '9:30');

        expect(result).toContain('09:30');
      });

      it('should handle "unknown" keyword', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_TIME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, 'unknown');

        expect(result).toContain('12:00');
      });

      it('should handle "don\'t know" phrase', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_TIME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, "I don't know");

        expect(result).toContain('12:00');
      });

      it('should extract time from mixed format like "2:30 PM"', async () => {
        // The regex extracts "2:30" from "2:30 PM" which is valid
        const user = createMockUser(ConversationState.AWAITING_BIRTH_TIME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '2:30 PM');

        expect(result).toContain('Birth time saved');
      });

      it('should reject hour > 23', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_TIME);

        const result = await service.processMessage(user, '25:00');

        expect(result).toContain('Invalid time');
      });

      it('should reject minute > 59', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_TIME);

        const result = await service.processMessage(user, '14:99');

        expect(result).toContain('Invalid time');
      });

      it('should extract valid time from string with negative prefix', async () => {
        // The regex extracts "1:30" from "-1:30" which is valid
        const user = createMockUser(ConversationState.AWAITING_BIRTH_TIME);
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, '-1:30');

        expect(result).toContain('Birth time saved');
      });
    });

    describe('messageText argument in AWAITING_BIRTH_PLACE state', () => {
      it('should accept city and country', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_PLACE);
        astrologyService.geocodeLocation.mockResolvedValue({
          latitude: 51.5074,
          longitude: -0.1278,
          timezone: 'Europe/London',
          formattedAddress: 'London, United Kingdom',
        });
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.findById.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);
        astrologyService.generateNatalChart.mockResolvedValue(mockNatalChart);
        aiService.interpretNatalChart.mockResolvedValue('Interpretation');

        const result = await service.processMessage(user, 'London, UK');

        expect(result).toContain('Location found');
      });

      it('should accept city only', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_PLACE);
        astrologyService.geocodeLocation.mockResolvedValue({
          latitude: 48.8566,
          longitude: 2.3522,
          timezone: 'Europe/Paris',
          formattedAddress: 'Paris, France',
        });
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.findById.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);
        astrologyService.generateNatalChart.mockResolvedValue(mockNatalChart);
        aiService.interpretNatalChart.mockResolvedValue('Interpretation');

        const result = await service.processMessage(user, 'Paris');

        expect(result).toContain('Location found');
      });

      it('should accept unicode location', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_PLACE);
        astrologyService.geocodeLocation.mockResolvedValue({
          latitude: 35.6762,
          longitude: 139.6503,
          timezone: 'Asia/Tokyo',
          formattedAddress: '東京, 日本',
        });
        userService.updateBirthInfo.mockResolvedValue(user);
        userService.findById.mockResolvedValue(user);
        userService.updateState.mockResolvedValue(user);
        astrologyService.generateNatalChart.mockResolvedValue(mockNatalChart);
        aiService.interpretNatalChart.mockResolvedValue('Interpretation');

        const result = await service.processMessage(user, '東京, 日本');

        expect(result).toContain('Location found');
      });

      it('should reject single character location', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_PLACE);

        const result = await service.processMessage(user, 'A');

        expect(result).toContain('valid city name');
      });

      it('should handle geocoding failure', async () => {
        const user = createMockUser(ConversationState.AWAITING_BIRTH_PLACE);
        astrologyService.geocodeLocation.mockRejectedValue(new Error('Not found'));

        const result = await service.processMessage(user, 'InvalidPlace123');

        expect(result).toContain("couldn't find that location");
      });
    });

    describe('messageText argument in CHATTING state', () => {
      it('should handle "menu" command', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);

        const result = await service.processMessage(user, 'menu');

        expect(result).toContain('What can I help you with');
      });

      it('should handle "Menu" command (case insensitive)', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);

        const result = await service.processMessage(user, 'Menu');

        expect(result).toContain('What can I help you with');
      });

      it('should handle "MENU" command (uppercase)', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);

        const result = await service.processMessage(user, 'MENU');

        expect(result).toContain('What can I help you with');
      });

      it('should handle "help" command', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);

        const result = await service.processMessage(user, 'help');

        expect(result).toContain('What can I help you with');
      });

      it('should handle "reset" command', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, 'reset');

        expect(result).toContain('Starting over');
      });

      it('should handle "start over" phrase', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);
        userService.updateState.mockResolvedValue(user);

        const result = await service.processMessage(user, 'start over');

        expect(result).toContain('Starting over');
      });

      it('should handle "my chart" command', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);

        const result = await service.processMessage(user, 'my chart');

        expect(result).toContain('Natal Chart Summary');
      });

      it('should handle "summary" command', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);

        const result = await service.processMessage(user, 'summary');

        expect(result).toContain('Natal Chart Summary');
      });

      it('should handle "today" command', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);
        aiService.getDailyHoroscope.mockResolvedValue('Your horoscope...');

        const result = await service.processMessage(user, 'today');

        expect(result).toBe('Your horoscope...');
      });

      it('should handle "daily" command', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);
        aiService.getDailyHoroscope.mockResolvedValue('Your horoscope...');

        const result = await service.processMessage(user, 'daily');

        expect(result).toBe('Your horoscope...');
      });

      it('should handle "horoscope" command', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);
        aiService.getDailyHoroscope.mockResolvedValue('Your horoscope...');

        const result = await service.processMessage(user, 'horoscope');

        expect(result).toBe('Your horoscope...');
      });

      it('should handle general question', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);
        aiService.getPersonalizedAdvice.mockResolvedValue('AI advice...');

        const result = await service.processMessage(user, 'What is my life purpose?');

        expect(result).toBe('AI advice...');
      });

      it('should handle love-related question', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);
        aiService.getPersonalizedAdvice.mockResolvedValue('Love advice...');

        const result = await service.processMessage(user, 'Tell me about my love life');

        expect(result).toBe('Love advice...');
      });

      it('should handle career-related question', async () => {
        const user = createMockUser(ConversationState.CHATTING, true);
        aiService.getPersonalizedAdvice.mockResolvedValue('Career advice...');

        const result = await service.processMessage(user, 'What career suits me?');

        expect(result).toBe('Career advice...');
      });
    });
  });

  describe('getRecentMessages', () => {
    describe('userId argument', () => {
      it('should query with valid userId', async () => {
        messageRepository.find.mockResolvedValue([]);

        await service.getRecentMessages('valid-user-id');

        expect(messageRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'valid-user-id' },
          }),
        );
      });

      it('should query with UUID format userId', async () => {
        messageRepository.find.mockResolvedValue([]);

        await service.getRecentMessages('550e8400-e29b-41d4-a716-446655440000');

        expect(messageRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: '550e8400-e29b-41d4-a716-446655440000' },
          }),
        );
      });

      it('should return empty array for non-existent user', async () => {
        messageRepository.find.mockResolvedValue([]);

        const result = await service.getRecentMessages('non-existent');

        expect(result).toEqual([]);
      });
    });

    describe('limit argument', () => {
      it('should use default limit of 10', async () => {
        messageRepository.find.mockResolvedValue([]);

        await service.getRecentMessages('user-id');

        expect(messageRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 10,
          }),
        );
      });

      it('should accept custom limit', async () => {
        messageRepository.find.mockResolvedValue([]);

        await service.getRecentMessages('user-id', 5);

        expect(messageRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 5,
          }),
        );
      });

      it('should accept limit of 1', async () => {
        messageRepository.find.mockResolvedValue([]);

        await service.getRecentMessages('user-id', 1);

        expect(messageRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 1,
          }),
        );
      });

      it('should accept large limit', async () => {
        messageRepository.find.mockResolvedValue([]);

        await service.getRecentMessages('user-id', 100);

        expect(messageRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 100,
          }),
        );
      });

      it('should order by createdAt DESC', async () => {
        messageRepository.find.mockResolvedValue([]);

        await service.getRecentMessages('user-id');

        expect(messageRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            order: { createdAt: 'DESC' },
          }),
        );
      });
    });
  });
});
