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

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateByPhone', () => {
    it('should return existing user if found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOrCreateByPhone('whatsapp:+1234567890');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { phoneNumber: 'whatsapp:+1234567890' },
        relations: ['natalChart'],
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.findOrCreateByPhone('whatsapp:+1234567890');

      expect(result).toEqual(mockUser);
      expect(mockRepository.create).toHaveBeenCalledWith({
        phoneNumber: 'whatsapp:+1234567890',
        conversationState: ConversationState.NEW,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('updateState', () => {
    it('should update user conversation state', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue({
        ...mockUser,
        conversationState: ConversationState.AWAITING_NAME,
      });

      const result = await service.updateState(
        'test-uuid-123',
        ConversationState.AWAITING_NAME,
      );

      expect(mockRepository.update).toHaveBeenCalledWith('test-uuid-123', {
        conversationState: ConversationState.AWAITING_NAME,
      });
      expect(result.conversationState).toBe(ConversationState.AWAITING_NAME);
    });
  });

  describe('updateBirthInfo', () => {
    it('should update user birth information', async () => {
      const birthInfo = {
        name: 'Jane Doe',
        birthDate: new Date('1985-06-15'),
        birthTime: '09:00',
      };

      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue({ ...mockUser, ...birthInfo });

      const result = await service.updateBirthInfo('test-uuid-123', birthInfo);

      expect(mockRepository.update).toHaveBeenCalledWith(
        'test-uuid-123',
        birthInfo,
      );
      expect(result.name).toBe('Jane Doe');
    });

    it('should update partial birth information', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue({
        ...mockUser,
        birthPlace: 'Paris, France',
      });

      const result = await service.updateBirthInfo('test-uuid-123', {
        birthPlace: 'Paris, France',
      });

      expect(result.birthPlace).toBe('Paris, France');
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('test-uuid-123');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-uuid-123' },
        relations: ['natalChart'],
      });
    });

    it('should throw error if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        'User not found: non-existent',
      );
    });
  });

  describe('hasCompleteBirthData', () => {
    it('should return true when all birth data is present', () => {
      const result = service.hasCompleteBirthData(mockUser);
      expect(result).toBe(true);
    });

    it('should return false when birthDate is missing', () => {
      const incompleteUser = { ...mockUser, birthDate: null as any };
      const result = service.hasCompleteBirthData(incompleteUser);
      expect(result).toBe(false);
    });

    it('should return false when birthTime is missing', () => {
      const incompleteUser = { ...mockUser, birthTime: null as any };
      const result = service.hasCompleteBirthData(incompleteUser);
      expect(result).toBe(false);
    });

    it('should return false when birthPlace is missing', () => {
      const incompleteUser = { ...mockUser, birthPlace: null as any };
      const result = service.hasCompleteBirthData(incompleteUser);
      expect(result).toBe(false);
    });

    it('should return false when coordinates are missing', () => {
      const incompleteUser = { ...mockUser, birthLatitude: null as any };
      const result = service.hasCompleteBirthData(incompleteUser);
      expect(result).toBe(false);
    });
  });
});

