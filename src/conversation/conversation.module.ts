import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { ConversationService } from './conversation.service';
import { UserModule } from '../user/user.module';
import { AstrologyModule } from '../astrology/astrology.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    UserModule,
    forwardRef(() => AstrologyModule),
    forwardRef(() => AiModule),
  ],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}

