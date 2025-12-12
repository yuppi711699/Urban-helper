import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import { AstrologyService } from './astrology.service';
import { NatalChart } from './entities/natal-chart.entity';
import { User, ConversationState } from '../user/entities/user.entity';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AstrologyService', () => {
  let service: AstrologyService;
  let chartRepository: jest.Mocked<Repository<NatalChart>>;

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
    conversationState: ConversationState.CHART_READY,
    natalChart: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AstrologyService,
        {
          provide: getRepositoryToken(NatalChart),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                ASTROLOGY_API_CLIENT_ID: '',
                ASTROLOGY_API_CLIENT_SECRET: '',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AstrologyService>(AstrologyService);
    chartRepository = module.get(getRepositoryToken(NatalChart));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('geocodeLocation', () => {
    describe('place argument', () => {
      it('should geocode city and country format', async () => {
        mockedAxios.get.mockImplementation((url: string) => {
          if (url.includes('nominatim')) {
            return Promise.resolve({
              data: [{ lat: '51.5074', lon: '-0.1278', display_name: 'London, UK' }],
            });
          }
          return Promise.resolve({ data: { timeZone: 'Europe/London' } });
        });

        const result = await service.geocodeLocation('London, UK');

        expect(result.latitude).toBeCloseTo(51.5074, 2);
        expect(result.longitude).toBeCloseTo(-0.1278, 2);
      });

      it('should geocode city only', async () => {
        mockedAxios.get.mockImplementation((url: string) => {
          if (url.includes('nominatim')) {
            return Promise.resolve({
              data: [{ lat: '48.8566', lon: '2.3522', display_name: 'Paris, France' }],
            });
          }
          return Promise.resolve({ data: { timeZone: 'Europe/Paris' } });
        });

        const result = await service.geocodeLocation('Paris');

        expect(result.latitude).toBeCloseTo(48.8566, 2);
      });

      it('should geocode full address', async () => {
        mockedAxios.get.mockImplementation((url: string) => {
          if (url.includes('nominatim')) {
            return Promise.resolve({
              data: [{ lat: '40.7128', lon: '-74.0060', display_name: '123 Broadway, New York, USA' }],
            });
          }
          return Promise.resolve({ data: { timeZone: 'America/New_York' } });
        });

        const result = await service.geocodeLocation('123 Broadway, New York, USA');

        expect(result.formattedAddress).toContain('Broadway');
      });

      it('should geocode unicode place name', async () => {
        mockedAxios.get.mockImplementation((url: string) => {
          if (url.includes('nominatim')) {
            return Promise.resolve({
              data: [{ lat: '35.6762', lon: '139.6503', display_name: '東京, 日本' }],
            });
          }
          return Promise.resolve({ data: { timeZone: 'Asia/Tokyo' } });
        });

        const result = await service.geocodeLocation('東京, 日本');

        expect(result.timezone).toBe('Asia/Tokyo');
      });

      it('should geocode place with special characters', async () => {
        mockedAxios.get.mockImplementation((url: string) => {
          if (url.includes('nominatim')) {
            return Promise.resolve({
              data: [{ lat: '48.2082', lon: '16.3738', display_name: 'Wien, Österreich' }],
            });
          }
          return Promise.resolve({ data: { timeZone: 'Europe/Vienna' } });
        });

        const result = await service.geocodeLocation('Wien, Österreich');

        expect(result.formattedAddress).toBeDefined();
      });

      it('should throw for non-existent place', async () => {
        mockedAxios.get.mockResolvedValue({ data: [] });

        await expect(service.geocodeLocation('NonExistentPlace12345')).rejects.toThrow(
          'Could not geocode location',
        );
      });

      it('should throw for empty place', async () => {
        mockedAxios.get.mockResolvedValue({ data: [] });

        await expect(service.geocodeLocation('')).rejects.toThrow();
      });

      it('should handle API timeout', async () => {
        mockedAxios.get.mockRejectedValue(new Error('timeout'));

        await expect(service.geocodeLocation('London')).rejects.toThrow();
      });

      it('should handle network error', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Network Error'));

        await expect(service.geocodeLocation('London')).rejects.toThrow();
      });
    });

    describe('return value', () => {
      it('should return latitude as number', async () => {
        mockedAxios.get.mockImplementation((url: string) => {
          if (url.includes('nominatim')) {
            return Promise.resolve({
              data: [{ lat: '51.5074', lon: '-0.1278', display_name: 'London' }],
            });
          }
          return Promise.resolve({ data: { timeZone: 'UTC' } });
        });

        const result = await service.geocodeLocation('London');

        expect(typeof result.latitude).toBe('number');
      });

      it('should return longitude as number', async () => {
        mockedAxios.get.mockImplementation((url: string) => {
          if (url.includes('nominatim')) {
            return Promise.resolve({
              data: [{ lat: '51.5074', lon: '-0.1278', display_name: 'London' }],
            });
          }
          return Promise.resolve({ data: { timeZone: 'UTC' } });
        });

        const result = await service.geocodeLocation('London');

        expect(typeof result.longitude).toBe('number');
      });

      it('should return timezone string', async () => {
        mockedAxios.get.mockImplementation((url: string) => {
          if (url.includes('nominatim')) {
            return Promise.resolve({
              data: [{ lat: '51.5074', lon: '-0.1278', display_name: 'London' }],
            });
          }
          return Promise.resolve({ data: { timeZone: 'Europe/London' } });
        });

        const result = await service.geocodeLocation('London');

        expect(typeof result.timezone).toBe('string');
        expect(result.timezone).toBe('Europe/London');
      });

      it('should fallback timezone on API error', async () => {
        mockedAxios.get.mockImplementation((url: string) => {
          if (url.includes('nominatim')) {
            return Promise.resolve({
              data: [{ lat: '0', lon: '0', display_name: 'Test' }],
            });
          }
          return Promise.reject(new Error('Timezone API error'));
        });

        const result = await service.geocodeLocation('Test');

        expect(result.timezone).toBeDefined();
      });

      it('should return formattedAddress', async () => {
        mockedAxios.get.mockImplementation((url: string) => {
          if (url.includes('nominatim')) {
            return Promise.resolve({
              data: [{ lat: '51.5074', lon: '-0.1278', display_name: 'London, Greater London, England, UK' }],
            });
          }
          return Promise.resolve({ data: { timeZone: 'UTC' } });
        });

        const result = await service.geocodeLocation('London');

        expect(result.formattedAddress).toBe('London, Greater London, England, UK');
      });
    });
  });

  describe('generateNatalChart', () => {
    beforeEach(() => {
      chartRepository.save.mockImplementation((chart) => Promise.resolve(chart as NatalChart));
    });

    describe('user.birthDate argument', () => {
      it('should calculate chart for date in 1990', async () => {
        const user = { ...mockUser, birthDate: new Date('1990-12-25') };

        const result = await service.generateNatalChart(user);

        expect(result.sunSign).toBe('Capricorn');
      });

      it('should calculate chart for date in 1950', async () => {
        const user = { ...mockUser, birthDate: new Date('1950-06-15') };

        const result = await service.generateNatalChart(user);

        expect(result.sunSign).toBe('Gemini');
      });

      it('should calculate chart for date in 2000', async () => {
        const user = { ...mockUser, birthDate: new Date('2000-03-25') };

        const result = await service.generateNatalChart(user);

        expect(result.sunSign).toBe('Aries');
      });

      it('should calculate chart for date in 2020', async () => {
        const user = { ...mockUser, birthDate: new Date('2020-07-25') };

        const result = await service.generateNatalChart(user);

        expect(result.sunSign).toBe('Leo');
      });

      it('should handle January 1st', async () => {
        const user = { ...mockUser, birthDate: new Date('1990-01-01') };

        const result = await service.generateNatalChart(user);

        expect(result.sunSign).toBe('Capricorn');
      });

      it('should handle December 31st', async () => {
        const user = { ...mockUser, birthDate: new Date('1990-12-31') };

        const result = await service.generateNatalChart(user);

        expect(result.sunSign).toBe('Capricorn');
      });

      it('should handle leap year Feb 29', async () => {
        const user = { ...mockUser, birthDate: new Date('2000-02-29') };

        const result = await service.generateNatalChart(user);

        expect(result.sunSign).toBe('Pisces');
      });
    });

    describe('user.birthTime argument', () => {
      it('should use midnight time 00:00', async () => {
        const user = { ...mockUser, birthTime: '00:00' };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should use noon time 12:00', async () => {
        const user = { ...mockUser, birthTime: '12:00' };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should use late evening 23:59', async () => {
        const user = { ...mockUser, birthTime: '23:59' };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should parse time correctly for ascendant calculation', async () => {
        const morningUser = { ...mockUser, birthTime: '06:00' };
        const eveningUser = { ...mockUser, birthTime: '18:00' };

        const morningResult = await service.generateNatalChart(morningUser);
        const eveningResult = await service.generateNatalChart(eveningUser);

        // Different times should potentially yield different ascendants
        expect(morningResult.ascendant).toBeDefined();
        expect(eveningResult.ascendant).toBeDefined();
      });
    });

    describe('user.birthLatitude argument', () => {
      it('should handle positive latitude (northern hemisphere)', async () => {
        const user = { ...mockUser, birthLatitude: 51.5074 };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should handle negative latitude (southern hemisphere)', async () => {
        const user = { ...mockUser, birthLatitude: -33.8688 };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should handle equator latitude 0', async () => {
        const user = { ...mockUser, birthLatitude: 0 };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should handle extreme north latitude 89', async () => {
        const user = { ...mockUser, birthLatitude: 89 };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should handle extreme south latitude -89', async () => {
        const user = { ...mockUser, birthLatitude: -89 };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });
    });

    describe('user.birthLongitude argument', () => {
      it('should handle positive longitude (eastern hemisphere)', async () => {
        const user = { ...mockUser, birthLongitude: 139.6917 };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should handle negative longitude (western hemisphere)', async () => {
        const user = { ...mockUser, birthLongitude: -74.006 };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should handle prime meridian 0', async () => {
        const user = { ...mockUser, birthLongitude: 0 };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should handle date line 180', async () => {
        const user = { ...mockUser, birthLongitude: 180 };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });

      it('should handle date line -180', async () => {
        const user = { ...mockUser, birthLongitude: -180 };

        const result = await service.generateNatalChart(user);

        expect(result).toBeDefined();
      });
    });

    describe('zodiac sign calculation by date', () => {
      const zodiacTests = [
        { date: '1990-01-05', expected: 'Capricorn' },
        { date: '1990-01-25', expected: 'Aquarius' },
        { date: '1990-02-25', expected: 'Pisces' },
        { date: '1990-03-25', expected: 'Aries' },
        { date: '1990-04-25', expected: 'Taurus' },
        { date: '1990-05-25', expected: 'Gemini' },
        { date: '1990-06-25', expected: 'Cancer' },
        { date: '1990-07-25', expected: 'Leo' },
        { date: '1990-08-25', expected: 'Virgo' },
        { date: '1990-09-25', expected: 'Libra' },
        { date: '1990-10-25', expected: 'Scorpio' },
        { date: '1990-11-25', expected: 'Sagittarius' },
        { date: '1990-12-25', expected: 'Capricorn' },
      ];

      zodiacTests.forEach(({ date, expected }) => {
        it(`should return ${expected} for ${date}`, async () => {
          const user = { ...mockUser, birthDate: new Date(date) };

          const result = await service.generateNatalChart(user);

          expect(result.sunSign).toBe(expected);
        });
      });
    });

    describe('return value structure', () => {
      it('should return sunSign', async () => {
        const result = await service.generateNatalChart(mockUser);

        expect(result.sunSign).toBeDefined();
        expect(typeof result.sunSign).toBe('string');
      });

      it('should return moonSign', async () => {
        const result = await service.generateNatalChart(mockUser);

        expect(result.moonSign).toBeDefined();
        expect(typeof result.moonSign).toBe('string');
      });

      it('should return ascendant', async () => {
        const result = await service.generateNatalChart(mockUser);

        expect(result.ascendant).toBeDefined();
        expect(typeof result.ascendant).toBe('string');
      });

      it('should return planets array', async () => {
        const result = await service.generateNatalChart(mockUser);

        expect(result.planets).toBeInstanceOf(Array);
      });

      it('should return houses array', async () => {
        const result = await service.generateNatalChart(mockUser);

        expect(result.houses).toBeInstanceOf(Array);
      });

      it('should return aspects array', async () => {
        const result = await service.generateNatalChart(mockUser);

        expect(result.aspects).toBeInstanceOf(Array);
      });

      it('should set user reference', async () => {
        const result = await service.generateNatalChart(mockUser);

        expect(result.user).toBe(mockUser);
      });
    });
  });

  describe('getCurrentTransits', () => {
    it('should return array of planet positions', async () => {
      const result = await service.getCurrentTransits();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include Sun in transits', async () => {
      const result = await service.getCurrentTransits();

      const sun = result.find((p) => p.planet === 'Sun');
      expect(sun).toBeDefined();
    });

    it('should include Moon in transits', async () => {
      const result = await service.getCurrentTransits();

      const moon = result.find((p) => p.planet === 'Moon');
      expect(moon).toBeDefined();
    });

    it('should return planet with sign property', async () => {
      const result = await service.getCurrentTransits();

      expect(result[0]).toHaveProperty('sign');
      expect(typeof result[0].sign).toBe('string');
    });

    it('should return planet with degree property', async () => {
      const result = await service.getCurrentTransits();

      expect(result[0]).toHaveProperty('degree');
      expect(typeof result[0].degree).toBe('number');
    });

    it('should return planet with isRetrograde property', async () => {
      const result = await service.getCurrentTransits();

      expect(result[0]).toHaveProperty('isRetrograde');
      expect(typeof result[0].isRetrograde).toBe('boolean');
    });
  });
});

describe('AstrologyService with Prokerala API configured', () => {
  let service: AstrologyService;
  let chartRepository: jest.Mocked<Repository<NatalChart>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AstrologyService,
        {
          provide: getRepositoryToken(NatalChart),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                ASTROLOGY_API_CLIENT_ID: 'test_client_id',
                ASTROLOGY_API_CLIENT_SECRET: 'test_client_secret',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AstrologyService>(AstrologyService);
    chartRepository = module.get(getRepositoryToken(NatalChart));
  });

  it('should fallback to basic calculation on API error', async () => {
    const mockUser: User = {
      id: 'test-uuid',
      phoneNumber: 'whatsapp:+1234567890',
      name: 'John',
      birthDate: new Date('1990-12-25'),
      birthTime: '14:30',
      birthPlace: 'London, UK',
      birthLatitude: 51.5074,
      birthLongitude: -0.1278,
      timezone: 'Europe/London',
      conversationState: ConversationState.CHART_READY,
      natalChart: null as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedAxios.post.mockRejectedValue(new Error('API Error'));
    chartRepository.save.mockImplementation((chart) => Promise.resolve(chart as NatalChart));

    const result = await service.generateNatalChart(mockUser);

    expect(result.sunSign).toBe('Capricorn');
  });
});
