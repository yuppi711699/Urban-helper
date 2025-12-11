import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, ConversationState } from './entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Find or create a user by phone number
   */
  async findOrCreateByPhone(phoneNumber: string): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { phoneNumber },
      relations: ['natalChart'],
    });

    if (!user) {
      user = this.userRepository.create({
        phoneNumber,
        conversationState: ConversationState.NEW,
      });
      await this.userRepository.save(user);
      this.logger.log(`Created new user: ${phoneNumber}`);
    }

    return user;
  }

  /**
   * Update user's conversation state
   */
  async updateState(userId: string, state: ConversationState): Promise<User> {
    await this.userRepository.update(userId, { conversationState: state });
    return this.findById(userId);
  }

  /**
   * Update user's birth information
   */
  async updateBirthInfo(
    userId: string,
    data: Partial<{
      name: string;
      birthDate: Date;
      birthTime: string;
      birthPlace: string;
      birthLatitude: number;
      birthLongitude: number;
      timezone: string;
    }>,
  ): Promise<User> {
    await this.userRepository.update(userId, data);
    return this.findById(userId);
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['natalChart'],
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    return user;
  }

  /**
   * Check if user has complete birth data
   */
  hasCompleteBirthData(user: User): boolean {
    return !!(
      user.birthDate &&
      user.birthTime &&
      user.birthPlace &&
      user.birthLatitude &&
      user.birthLongitude
    );
  }
}


