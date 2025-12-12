import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Webhook endpoints', () => {
    describe('GET /webhook/whatsapp', () => {
      it('should return 403 for invalid verification', () => {
        return request(app.getHttpServer())
          .get('/webhook/whatsapp')
          .query({
            'hub.mode': 'subscribe',
            'hub.verify_token': 'wrong_token',
            'hub.challenge': 'test_challenge',
          })
          .expect(403);
      });
    });

    describe('POST /webhook/whatsapp', () => {
      it('should accept valid webhook payload', () => {
        return request(app.getHttpServer())
          .post('/webhook/whatsapp')
          .send({
            MessageSid: 'SM123456789',
            AccountSid: 'AC123456789',
            From: 'whatsapp:+1234567890',
            To: 'whatsapp:+0987654321',
            Body: 'Hello',
          })
          .expect(200);
      });

      it('should reject payload missing required fields', () => {
        return request(app.getHttpServer())
          .post('/webhook/whatsapp')
          .send({
            MessageSid: 'SM123456789',
            // Missing other required fields
          })
          .expect(400);
      });
    });

    describe('POST /webhook/whatsapp/status', () => {
      it('should accept status callback', () => {
        return request(app.getHttpServer())
          .post('/webhook/whatsapp/status')
          .send({
            MessageSid: 'SM123456789',
            MessageStatus: 'delivered',
          })
          .expect(200);
      });
    });
  });
});

