import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { NatalChart } from './entities/natal-chart.entity';
import { AstrologyService } from './astrology.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NatalChart]),
    HttpModule,
    forwardRef(() => UserModule),
  ],
  providers: [AstrologyService],
  exports: [AstrologyService],
})
export class AstrologyModule {}

