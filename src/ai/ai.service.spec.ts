import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AstrologyService } from '../astrology/astrology.service';
import { User, ConversationState } from '../user/entities/user.entity';
import { NatalChart } from '../astrology/entities/natal-chart.entity';
import { Message, MessageRole } from '../conversation/entities/message.entity';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'AI response content' } }],
          }),
        },
      },
    })),
  };
});

describe('AiService', () => {
  let service: AiService;
  let astrologyService: jest.Mocked<AstrologyService>;

  const mockNatalChart: NatalChart = {
    id: 'chart-uuid',
    user: null as any,
    planets: [
      { planet: 'Sun', sign: 'Capricorn', degree: 15, house: 1, isRetrograde: false },
      { planet: 'Moon', sign: 'Aries', degree: 10, house: 4, isRetrograde: false },
      { planet: 'Mercury', sign: 'Capricorn', degree: 20, house: 1, isRetrograde: true },
      { planet: 'Venus', sign: 'Sagittarius', degree: 5, house: 12, isRetrograde: false },
      { planet: 'Mars', sign: 'Pisces', degree: 25, house: 3, isRetrograde: false },
      { planet: 'Jupiter', sign: 'Taurus', degree: 12, house: 5, isRetrograde: false },
      { planet: 'Saturn', sign: 'Leo', degree: 18, house: 8, isRetrograde: true },
    ],
    houses: [
      { house: 1, sign: 'Leo', degree: 0 },
      { house: 2, sign: 'Virgo', degree: 0 },
    ],
    aspects: [],
    sunSign: 'Capricorn',
    moonSign: 'Aries',
    ascendant: 'Leo',
    rawApiResponse: '{}',
    aiInterpretation: null as any,
    lifeStoryNarrative: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
    conversationState: ConversationState.CHATTING,
    natalChart: mockNatalChart,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('without OpenAI API key (fallback mode)', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: any) => {
                if (key === 'OPENAI_API_KEY') return '';
                if (key === 'OPENAI_MODEL') return defaultValue || 'gpt-4-turbo-preview';
                return defaultValue;
              }),
            },
          },
          {
            provide: AstrologyService,
            useValue: {
              getCurrentTransits: jest.fn().mockResolvedValue([
                { planet: 'Sun', sign: 'Sagittarius', degree: 15, house: 1, isRetrograde: false },
                { planet: 'Moon', sign: 'Cancer', degree: 22, house: 7, isRetrograde: false },
              ]),
            },
          },
        ],
      }).compile();

      service = module.get<AiService>(AiService);
      astrologyService = module.get(AstrologyService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    describe('interpretNatalChart', () => {
      describe('chart.sunSign argument', () => {
        it('should include Capricorn sun sign in interpretation', async () => {
          const result = await service.interpretNatalChart(mockNatalChart);

          expect(result).toContain('Capricorn');
        });

        it('should include any sun sign in interpretation', async () => {
          const chart = { ...mockNatalChart, sunSign: 'Aries' };

          const result = await service.interpretNatalChart(chart);

          expect(result).toContain('Aries');
        });

        it('should handle all zodiac signs', async () => {
          const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

          for (const sign of signs) {
            const chart = { ...mockNatalChart, sunSign: sign };
            const result = await service.interpretNatalChart(chart);
            expect(result).toContain(sign);
          }
        });
      });

      describe('chart.moonSign argument', () => {
        it('should include moon sign in interpretation', async () => {
          const result = await service.interpretNatalChart(mockNatalChart);

          expect(result).toContain('Aries');
        });

        it('should handle different moon signs', async () => {
          const chart = { ...mockNatalChart, moonSign: 'Scorpio' };

          const result = await service.interpretNatalChart(chart);

          expect(result).toContain('Scorpio');
        });
      });

      describe('chart.ascendant argument', () => {
        it('should include ascendant in interpretation', async () => {
          const result = await service.interpretNatalChart(mockNatalChart);

          expect(result).toContain('Leo');
        });

        it('should handle different ascendants', async () => {
          const chart = { ...mockNatalChart, ascendant: 'Virgo' };

          const result = await service.interpretNatalChart(chart);

          expect(result).toContain('Virgo');
        });
      });

      describe('chart.planets argument', () => {
        it('should handle empty planets array', async () => {
          const chart = { ...mockNatalChart, planets: [] };

          const result = await service.interpretNatalChart(chart);

          expect(result).toBeDefined();
        });

        it('should handle null planets', async () => {
          const chart = { ...mockNatalChart, planets: null as any };

          const result = await service.interpretNatalChart(chart);

          expect(result).toBeDefined();
        });

        it('should handle undefined planets', async () => {
          const chart = { ...mockNatalChart, planets: undefined as any };

          const result = await service.interpretNatalChart(chart);

          expect(result).toBeDefined();
        });
      });
    });

    describe('getPersonalizedAdvice', () => {
      describe('user.name argument', () => {
        it('should include user name in advice', async () => {
          const result = await service.getPersonalizedAdvice(mockUser, 'Question', []);

          expect(result).toContain('John');
        });

        it('should handle null name', async () => {
          const user = { ...mockUser, name: null as any };

          const result = await service.getPersonalizedAdvice(user, 'Question', []);

          expect(result).toBeDefined();
        });

        it('should handle empty name', async () => {
          const user = { ...mockUser, name: '' };

          const result = await service.getPersonalizedAdvice(user, 'Question', []);

          expect(result).toBeDefined();
        });
      });

      describe('user.natalChart argument', () => {
        it('should use chart info in advice', async () => {
          const result = await service.getPersonalizedAdvice(mockUser, 'Question', []);

          expect(result).toContain(mockNatalChart.sunSign);
        });

        it('should handle null natalChart', async () => {
          const user = { ...mockUser, natalChart: null as any };

          const result = await service.getPersonalizedAdvice(user, 'Question', []);

          expect(result).toBeDefined();
        });

        it('should handle undefined natalChart', async () => {
          const user = { ...mockUser, natalChart: undefined as any };

          const result = await service.getPersonalizedAdvice(user, 'Question', []);

          expect(result).toBeDefined();
        });
      });

      describe('question argument', () => {
        it('should detect love-related keywords', async () => {
          const result = await service.getPersonalizedAdvice(mockUser, 'Tell me about love', []);
          // Fallback contains "Love Insight" for love questions
          expect(result.toLowerCase()).toContain('love');
        });

        it('should detect career-related keywords', async () => {
          const result = await service.getPersonalizedAdvice(mockUser, 'Tell me about career', []);
          // Fallback contains "Career Insight" for career questions
          expect(result.toLowerCase()).toContain('career');
        });

        it('should handle general questions', async () => {
          const result = await service.getPersonalizedAdvice(mockUser, 'What is my life purpose?', []);

          expect(result).toContain('Guidance');
        });

        it('should handle empty question', async () => {
          const result = await service.getPersonalizedAdvice(mockUser, '', []);

          expect(result).toBeDefined();
        });

        it('should handle unicode question', async () => {
          const result = await service.getPersonalizedAdvice(mockUser, '你好，请告诉我关于爱情', []);

          expect(result).toBeDefined();
        });

        it('should handle very long question', async () => {
          const longQuestion = 'What '.repeat(100) + 'should I do?';

          const result = await service.getPersonalizedAdvice(mockUser, longQuestion, []);

          expect(result).toBeDefined();
        });
      });

      describe('messageHistory argument', () => {
        it('should handle empty message history', async () => {
          const result = await service.getPersonalizedAdvice(mockUser, 'Question', []);

          expect(result).toBeDefined();
        });

        it('should handle single message in history', async () => {
          const history: Message[] = [
            {
              id: '1',
              userId: mockUser.id,
              user: mockUser,
              role: MessageRole.USER,
              content: 'Previous question',
              whatsappMessageId: null as any,
              createdAt: new Date(),
            },
          ];

          const result = await service.getPersonalizedAdvice(mockUser, 'New question', history);

          expect(result).toBeDefined();
        });

        it('should handle multiple messages in history', async () => {
          const history: Message[] = [
            {
              id: '1',
              userId: mockUser.id,
              user: mockUser,
              role: MessageRole.USER,
              content: 'Question 1',
              whatsappMessageId: null as any,
              createdAt: new Date(),
            },
            {
              id: '2',
              userId: mockUser.id,
              user: mockUser,
              role: MessageRole.ASSISTANT,
              content: 'Answer 1',
              whatsappMessageId: null as any,
              createdAt: new Date(),
            },
            {
              id: '3',
              userId: mockUser.id,
              user: mockUser,
              role: MessageRole.USER,
              content: 'Question 2',
              whatsappMessageId: null as any,
              createdAt: new Date(),
            },
          ];

          const result = await service.getPersonalizedAdvice(mockUser, 'New question', history);

          expect(result).toBeDefined();
        });

        it('should handle messages with different roles', async () => {
          const history: Message[] = [
            {
              id: '1',
              userId: mockUser.id,
              user: mockUser,
              role: MessageRole.SYSTEM,
              content: 'System message',
              whatsappMessageId: null as any,
              createdAt: new Date(),
            },
          ];

          const result = await service.getPersonalizedAdvice(mockUser, 'Question', history);

          expect(result).toBeDefined();
        });
      });
    });

    describe('getDailyHoroscope', () => {
      describe('user argument', () => {
        it('should include user name in horoscope', async () => {
          const result = await service.getDailyHoroscope(mockUser);

          expect(result).toContain('John');
        });

        it('should include sun sign in horoscope', async () => {
          const result = await service.getDailyHoroscope(mockUser);

          expect(result).toContain(mockNatalChart.sunSign);
        });

        it('should return error for user without chart', async () => {
          const user = { ...mockUser, natalChart: null as any };

          const result = await service.getDailyHoroscope(user);

          expect(result).toContain("don't have your chart");
        });

        it('should include focus areas', async () => {
          const result = await service.getDailyHoroscope(mockUser);

          expect(result).toContain('Love');
          expect(result).toContain('Career');
          expect(result).toContain('Wellness');
        });

        it('should include power word', async () => {
          const result = await service.getDailyHoroscope(mockUser);

          expect(result).toContain('Power Word');
        });

        it('should include current date info', async () => {
          const result = await service.getDailyHoroscope(mockUser);

          expect(result).toContain('Daily Horoscope');
        });
      });
    });
  });

  describe('with OpenAI API key configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: any) => {
                if (key === 'OPENAI_API_KEY') return 'sk-test-key-123';
                if (key === 'OPENAI_MODEL') return 'gpt-4-turbo-preview';
                return defaultValue;
              }),
            },
          },
          {
            provide: AstrologyService,
            useValue: {
              getCurrentTransits: jest.fn().mockResolvedValue([]),
            },
          },
        ],
      }).compile();

      service = module.get<AiService>(AiService);
    });

    describe('OpenAI integration', () => {
      it('should initialize OpenAI client', () => {
        expect(service['openai']).toBeDefined();
      });

      it('should use configured model', () => {
        expect(service['model']).toBe('gpt-4-turbo-preview');
      });

      it('should return AI response for chart interpretation', async () => {
        const result = await service.interpretNatalChart(mockNatalChart);

        expect(result).toBe('AI response content');
      });

      it('should return AI response for personalized advice', async () => {
        const result = await service.getPersonalizedAdvice(mockUser, 'Question', []);

        expect(result).toBe('AI response content');
      });

      it('should return AI response for daily horoscope', async () => {
        const result = await service.getDailyHoroscope(mockUser);

        expect(result).toBe('AI response content');
      });
    });
  });
});

describe('AiService edge cases', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => ''),
          },
        },
        {
          provide: AstrologyService,
          useValue: {
            getCurrentTransits: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  describe('chart with minimal data', () => {
    it('should handle chart with only required fields', async () => {
      const minimalChart: NatalChart = {
        id: 'id',
        user: null as any,
        planets: [],
        houses: [],
        aspects: [],
        sunSign: 'Aries',
        moonSign: 'Taurus',
        ascendant: 'Gemini',
        rawApiResponse: null as any,
        aiInterpretation: null as any,
        lifeStoryNarrative: null as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.interpretNatalChart(minimalChart);

      expect(result).toBeDefined();
      expect(result).toContain('Aries');
    });
  });

  describe('user with minimal data', () => {
    it('should handle user without name and chart', async () => {
      const minimalUser: User = {
        id: 'id',
        phoneNumber: 'whatsapp:+1234567890',
        name: null as any,
        birthDate: new Date(),
        birthTime: '12:00',
        birthPlace: 'Test',
        birthLatitude: 0,
        birthLongitude: 0,
        timezone: 'UTC',
        conversationState: ConversationState.CHATTING,
        natalChart: null as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.getPersonalizedAdvice(minimalUser, 'Question', []);

      expect(result).toBeDefined();
    });
  });
});
