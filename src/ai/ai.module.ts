import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { AstrologyModule } from '../astrology/astrology.module';

@Module({
  imports: [forwardRef(() => AstrologyModule)],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

