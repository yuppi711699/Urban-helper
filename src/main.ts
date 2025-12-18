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
