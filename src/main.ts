import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // Don't use forbidNonWhitelisted - Twilio sends many extra fields
      transform: true,
    }),
  );

  app.enableCors();
  // todo: fix logging after start, because now its mess
  // todo: add health check endpoint
  // todo: fix verification of connection to database
  // todo: fix verification of connection to openai
  // todo: fix verification of connection to astrology api
  // todo: fix verification of connection to twilio
  // todo: research about infrastructure for product
  // todo: fix store of history of client's conversations in database
  // todo: fix store of history of client's natal charts in database
  // todo: fix store of history of client's astrological readings in database

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', Number(process.env.PORT));

  await app.listen(port);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`🚀 Natal Bot is running on port ${port}`);
  console.log('');
  console.log('📡 To verify ngrok connection, visit:');
  console.log(`   http://localhost:${port}/webhook/health`);
  console.log('   or your ngrok URL + /webhook/health');
  console.log('');
  console.log('📱 Twilio webhook endpoint:');
  console.log(`   POST /webhook/whatsapp`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
}

bootstrap();
