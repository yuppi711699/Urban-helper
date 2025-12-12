import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User, ConversationState } from './entities/user.entity';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 'test-uuid-123',
    phoneNumber: 'whatsapp:+1234567890',
    name: 'John Doe',
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

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateByPhone', () => {
    describe('phoneNumber argument', () => {
      it('should accept standard whatsapp format', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.findOrCreateByPhone('whatsapp:+1234567890');

        expect(result).toEqual(mockUser);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { phoneNumber: 'whatsapp:+1234567890' },
          relations: ['natalChart'],
        });
      });

      it('should accept phone number with country code', async () => {
        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue(mockUser);
        mockRepository.save.mockResolvedValue(mockUser);

        await service.findOrCreateByPhone('whatsapp:+44123456789');

        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { phoneNumber: 'whatsapp:+44123456789' },
          relations: ['natalChart'],
        });
      });

      it('should accept phone number with long country code', async () => {
        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue(mockUser);
        mockRepository.save.mockResolvedValue(mockUser);

        await service.findOrCreateByPhone('whatsapp:+995123456789');

        expect(mockRepository.create).toHaveBeenCalledWith({
          phoneNumber: 'whatsapp:+995123456789',
          conversationState: ConversationState.NEW,
        });
      });

      it('should handle empty string phone number', async () => {
        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue({ ...mockUser, phoneNumber: '' });
        mockRepository.save.mockResolvedValue({ ...mockUser, phoneNumber: '' });

        const result = await service.findOrCreateByPhone('');

        expect(result.phoneNumber).toBe('');
      });

      it('should handle phone number without whatsapp prefix', async () => {
        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue(mockUser);
        mockRepository.save.mockResolvedValue(mockUser);

        await service.findOrCreateByPhone('+1234567890');

        expect(mockRepository.create).toHaveBeenCalledWith({
          phoneNumber: '+1234567890',
          conversationState: ConversationState.NEW,
        });
      });

      it('should handle phone number with spaces', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);

        await service.findOrCreateByPhone('whatsapp: +1 234 567 890');

        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { phoneNumber: 'whatsapp: +1 234 567 890' },
          relations: ['natalChart'],
        });
      });
    });

    describe('return behavior', () => {
      it('should return existing user if found', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.findOrCreateByPhone('whatsapp:+1234567890');

        expect(result).toEqual(mockUser);
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('should create and return new user if not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue(mockUser);
        mockRepository.save.mockResolvedValue(mockUser);

        const result = await service.findOrCreateByPhone('whatsapp:+1234567890');

        expect(result).toEqual(mockUser);
        expect(mockRepository.create).toHaveBeenCalled();
        expect(mockRepository.save).toHaveBeenCalled();
      });

      it('should set initial state to NEW for new users', async () => {
        mockRepository.findOne.mockResolvedValue(null);
        mockRepository.create.mockReturnValue(mockUser);
        mockRepository.save.mockResolvedValue(mockUser);

        await service.findOrCreateByPhone('whatsapp:+9999999999');

        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            conversationState: ConversationState.NEW,
          }),
        );
      });
    });
  });

  describe('updateState', () => {
    describe('userId argument', () => {
      it('should accept valid UUID', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue(mockUser);

        await service.updateState('550e8400-e29b-41d4-a716-446655440000', ConversationState.AWAITING_NAME);

        expect(mockRepository.update).toHaveBeenCalledWith(
          '550e8400-e29b-41d4-a716-446655440000',
          expect.any(Object),
        );
      });

      it('should accept short UUID format', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue(mockUser);

        await service.updateState('abc123', ConversationState.AWAITING_NAME);

        expect(mockRepository.update).toHaveBeenCalledWith('abc123', expect.any(Object));
      });

      it('should handle empty userId', async () => {
        mockRepository.update.mockResolvedValue({ affected: 0 } as any);
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.updateState('', ConversationState.AWAITING_NAME)).rejects.toThrow();
      });
    });

    describe('state argument', () => {
      const testStates = [
        ConversationState.NEW,
        ConversationState.AWAITING_NAME,
        ConversationState.AWAITING_BIRTH_DATE,
        ConversationState.AWAITING_BIRTH_TIME,
        ConversationState.AWAITING_BIRTH_PLACE,
        ConversationState.CHART_READY,
        ConversationState.CHATTING,
      ];

      testStates.forEach((state) => {
        it(`should accept ${state} state`, async () => {
          mockRepository.update.mockResolvedValue({ affected: 1 } as any);
          mockRepository.findOne.mockResolvedValue({ ...mockUser, conversationState: state });

          const result = await service.updateState('test-uuid-123', state);

          expect(mockRepository.update).toHaveBeenCalledWith('test-uuid-123', {
            conversationState: state,
          });
          expect(result.conversationState).toBe(state);
        });
      });

      it('should transition from NEW to AWAITING_NAME', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({
          ...mockUser,
          conversationState: ConversationState.AWAITING_NAME,
        });

        const result = await service.updateState('test-uuid', ConversationState.AWAITING_NAME);

        expect(result.conversationState).toBe(ConversationState.AWAITING_NAME);
      });

      it('should transition from AWAITING_BIRTH_PLACE to CHART_READY', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({
          ...mockUser,
          conversationState: ConversationState.CHART_READY,
        });

        const result = await service.updateState('test-uuid', ConversationState.CHART_READY);

        expect(result.conversationState).toBe(ConversationState.CHART_READY);
      });
    });
  });

  describe('updateBirthInfo', () => {
    describe('userId argument', () => {
      it('should accept valid UUID', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue(mockUser);

        await service.updateBirthInfo('valid-uuid', { name: 'Test' });

        expect(mockRepository.update).toHaveBeenCalledWith('valid-uuid', { name: 'Test' });
      });

      it('should throw for non-existent userId', async () => {
        mockRepository.update.mockResolvedValue({ affected: 0 } as any);
        mockRepository.findOne.mockResolvedValue(null);

        await expect(
          service.updateBirthInfo('non-existent', { name: 'Test' }),
        ).rejects.toThrow('User not found');
      });
    });

    describe('data.name argument', () => {
      it('should update with simple name', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, name: 'John' });

        const result = await service.updateBirthInfo('test-uuid', { name: 'John' });

        expect(result.name).toBe('John');
      });

      it('should update with hyphenated name', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, name: 'Mary-Jane' });

        await service.updateBirthInfo('test-uuid', { name: 'Mary-Jane' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { name: 'Mary-Jane' });
      });

      it('should update with name containing apostrophe', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, name: "O'Connor" });

        await service.updateBirthInfo('test-uuid', { name: "O'Connor" });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { name: "O'Connor" });
      });

      it('should update with unicode name', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, name: '田中太郎' });

        await service.updateBirthInfo('test-uuid', { name: '田中太郎' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { name: '田中太郎' });
      });

      it('should update with empty name', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, name: '' });

        await service.updateBirthInfo('test-uuid', { name: '' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { name: '' });
      });
    });

    describe('data.birthDate argument', () => {
      it('should update with valid Date object', async () => {
        const birthDate = new Date('1990-06-15');
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthDate });

        await service.updateBirthInfo('test-uuid', { birthDate });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthDate });
      });

      it('should update with date from 1900', async () => {
        const birthDate = new Date('1900-01-01');
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthDate });

        await service.updateBirthInfo('test-uuid', { birthDate });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthDate });
      });

      it('should update with recent date', async () => {
        const birthDate = new Date('2020-12-31');
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthDate });

        await service.updateBirthInfo('test-uuid', { birthDate });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthDate });
      });

      it('should update with leap year date', async () => {
        const birthDate = new Date('2000-02-29');
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthDate });

        await service.updateBirthInfo('test-uuid', { birthDate });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthDate });
      });
    });

    describe('data.birthTime argument', () => {
      it('should update with midnight time', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthTime: '00:00' });

        await service.updateBirthInfo('test-uuid', { birthTime: '00:00' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthTime: '00:00' });
      });

      it('should update with noon time', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthTime: '12:00' });

        await service.updateBirthInfo('test-uuid', { birthTime: '12:00' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthTime: '12:00' });
      });

      it('should update with late night time', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthTime: '23:59' });

        await service.updateBirthInfo('test-uuid', { birthTime: '23:59' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthTime: '23:59' });
      });

      it('should update with time including seconds', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthTime: '14:30:45' });

        await service.updateBirthInfo('test-uuid', { birthTime: '14:30:45' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthTime: '14:30:45' });
      });
    });

    describe('data.birthPlace argument', () => {
      it('should update with city and country', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthPlace: 'Paris, France' });

        await service.updateBirthInfo('test-uuid', { birthPlace: 'Paris, France' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthPlace: 'Paris, France' });
      });

      it('should update with full address', async () => {
        const fullAddress = '123 Main Street, New York City, NY, USA';
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthPlace: fullAddress });

        await service.updateBirthInfo('test-uuid', { birthPlace: fullAddress });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthPlace: fullAddress });
      });

      it('should update with unicode location', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthPlace: '東京, 日本' });

        await service.updateBirthInfo('test-uuid', { birthPlace: '東京, 日本' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthPlace: '東京, 日本' });
      });
    });

    describe('data.birthLatitude argument', () => {
      it('should update with positive latitude', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthLatitude: 51.5074 });

        await service.updateBirthInfo('test-uuid', { birthLatitude: 51.5074 });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthLatitude: 51.5074 });
      });

      it('should update with negative latitude (southern hemisphere)', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthLatitude: -33.8688 });

        await service.updateBirthInfo('test-uuid', { birthLatitude: -33.8688 });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthLatitude: -33.8688 });
      });

      it('should update with equator latitude', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthLatitude: 0 });

        await service.updateBirthInfo('test-uuid', { birthLatitude: 0 });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthLatitude: 0 });
      });

      it('should update with maximum latitude (90)', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthLatitude: 90 });

        await service.updateBirthInfo('test-uuid', { birthLatitude: 90 });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthLatitude: 90 });
      });

      it('should update with minimum latitude (-90)', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthLatitude: -90 });

        await service.updateBirthInfo('test-uuid', { birthLatitude: -90 });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthLatitude: -90 });
      });
    });

    describe('data.birthLongitude argument', () => {
      it('should update with positive longitude (eastern hemisphere)', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthLongitude: 139.6917 });

        await service.updateBirthInfo('test-uuid', { birthLongitude: 139.6917 });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthLongitude: 139.6917 });
      });

      it('should update with negative longitude (western hemisphere)', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthLongitude: -74.006 });

        await service.updateBirthInfo('test-uuid', { birthLongitude: -74.006 });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthLongitude: -74.006 });
      });

      it('should update with prime meridian longitude', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthLongitude: 0 });

        await service.updateBirthInfo('test-uuid', { birthLongitude: 0 });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthLongitude: 0 });
      });

      it('should update with maximum longitude (180)', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthLongitude: 180 });

        await service.updateBirthInfo('test-uuid', { birthLongitude: 180 });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthLongitude: 180 });
      });

      it('should update with minimum longitude (-180)', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, birthLongitude: -180 });

        await service.updateBirthInfo('test-uuid', { birthLongitude: -180 });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { birthLongitude: -180 });
      });
    });

    describe('data.timezone argument', () => {
      it('should update with standard timezone', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, timezone: 'America/New_York' });

        await service.updateBirthInfo('test-uuid', { timezone: 'America/New_York' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { timezone: 'America/New_York' });
      });

      it('should update with UTC timezone', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, timezone: 'UTC' });

        await service.updateBirthInfo('test-uuid', { timezone: 'UTC' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { timezone: 'UTC' });
      });

      it('should update with offset timezone', async () => {
        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, timezone: 'Etc/GMT+5' });

        await service.updateBirthInfo('test-uuid', { timezone: 'Etc/GMT+5' });

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', { timezone: 'Etc/GMT+5' });
      });
    });

    describe('multiple fields update', () => {
      it('should update all birth info fields at once', async () => {
        const data = {
          name: 'Jane',
          birthDate: new Date('1985-03-15'),
          birthTime: '10:30',
          birthPlace: 'Tokyo, Japan',
          birthLatitude: 35.6762,
          birthLongitude: 139.6503,
          timezone: 'Asia/Tokyo',
        };

        mockRepository.update.mockResolvedValue({ affected: 1 } as any);
        mockRepository.findOne.mockResolvedValue({ ...mockUser, ...data });

        await service.updateBirthInfo('test-uuid', data);

        expect(mockRepository.update).toHaveBeenCalledWith('test-uuid', data);
      });
    });
  });

  describe('findById', () => {
    describe('userId argument', () => {
      it('should find user with valid UUID', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);

        const result = await service.findById('test-uuid-123');

        expect(result).toEqual(mockUser);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'test-uuid-123' },
          relations: ['natalChart'],
        });
      });

      it('should throw error for non-existent UUID', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findById('non-existent-uuid')).rejects.toThrow(
          'User not found: non-existent-uuid',
        );
      });

      it('should throw error for empty string UUID', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findById('')).rejects.toThrow('User not found: ');
      });

      it('should include natalChart relation in query', async () => {
        mockRepository.findOne.mockResolvedValue(mockUser);

        await service.findById('any-uuid');

        expect(mockRepository.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            relations: ['natalChart'],
          }),
        );
      });
    });
  });

  describe('hasCompleteBirthData', () => {
    describe('user argument with complete data', () => {
      it('should return true when all fields are present', () => {
        const result = service.hasCompleteBirthData(mockUser);
        expect(result).toBe(true);
      });

      it('should return true with valid non-zero values', () => {
        const user = {
          ...mockUser,
          birthDate: new Date('1900-01-01'),
          birthTime: '00:00',
          birthPlace: 'London',
          birthLatitude: 1,
          birthLongitude: 1,
        };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(true);
      });
    });

    describe('user argument with missing birthDate', () => {
      it('should return false when birthDate is null', () => {
        const user = { ...mockUser, birthDate: null as any };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });

      it('should return false when birthDate is undefined', () => {
        const user = { ...mockUser, birthDate: undefined as any };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });
    });

    describe('user argument with missing birthTime', () => {
      it('should return false when birthTime is null', () => {
        const user = { ...mockUser, birthTime: null as any };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });

      it('should return false when birthTime is undefined', () => {
        const user = { ...mockUser, birthTime: undefined as any };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });

      it('should return false when birthTime is empty string', () => {
        const user = { ...mockUser, birthTime: '' };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });
    });

    describe('user argument with missing birthPlace', () => {
      it('should return false when birthPlace is null', () => {
        const user = { ...mockUser, birthPlace: null as any };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });

      it('should return false when birthPlace is undefined', () => {
        const user = { ...mockUser, birthPlace: undefined as any };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });

      it('should return false when birthPlace is empty string', () => {
        const user = { ...mockUser, birthPlace: '' };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });
    });

    describe('user argument with missing coordinates', () => {
      it('should return false when birthLatitude is null', () => {
        const user = { ...mockUser, birthLatitude: null as any };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });

      it('should return false when birthLongitude is null', () => {
        const user = { ...mockUser, birthLongitude: null as any };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });

      it('should return false when coordinates are 0 (falsy in JS)', () => {
        // Note: The implementation uses truthy check, so 0 is treated as missing
        const user = { ...mockUser, birthLatitude: 0, birthLongitude: 0 };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });

      it('should return false when both coordinates are missing', () => {
        const user = { ...mockUser, birthLatitude: null as any, birthLongitude: null as any };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });
    });

    describe('user argument with multiple missing fields', () => {
      it('should return false when all birth fields are null', () => {
        const user = {
          ...mockUser,
          birthDate: null as any,
          birthTime: null as any,
          birthPlace: null as any,
          birthLatitude: null as any,
          birthLongitude: null as any,
        };
        const result = service.hasCompleteBirthData(user);
        expect(result).toBe(false);
      });
    });
  });
});
