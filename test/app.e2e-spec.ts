import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('App E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const timestamp = Date.now();
  const emailA = `e2e-${timestamp}-a@test.local`;
  const emailB = `e2e-${timestamp}-b@test.local`;
  const password = 'password123';

  let accessTokenA: string;
  let refreshTokenA: string;
  let accessTokenB: string;
  let taskIdA: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
      new TransformInterceptor(),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    dataSource = moduleFixture.get(getDataSourceToken());
  });

  afterAll(async () => {
    await dataSource.query("DELETE FROM users WHERE email LIKE 'e2e-%'");
    await app.close();
  });

  describe('Alur Auth', () => {
    it('register user A berhasil (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: emailA, password });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe(emailA);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('register dengan email duplikat → 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: emailA, password });

      expect(res.status).toBe(409);
    });

    it('register dengan body tidak valid → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'bukan-email', password: '123' });

      expect(res.status).toBe(400);
    });

    it('login user A berhasil (200), dapat access & refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailA, password });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      accessTokenA = res.body.data.accessToken;
      refreshTokenA = res.body.data.refreshToken;
    });

    it('login dengan password salah → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailA, password: 'salah-password' });

      expect(res.status).toBe(401);
    });

    it('akses /tasks tanpa token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/tasks');
      expect(res.status).toBe(401);
    });

    it('akses /tasks dengan token → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${accessTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toBeDefined();
    });
  });

  describe('Tasks CRUD', () => {
    it('membuat task baru → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({ title: 'Belajar NestJS e2e', priority: 'HIGH' });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Belajar NestJS e2e');
      taskIdA = res.body.data.id;
    });

    it('mengambil detail task → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tasks/${taskIdA}`)
        .set('Authorization', `Bearer ${accessTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(taskIdA);
    });

    it('update task → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskIdA}`)
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it(':id bukan UUID valid → 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/tasks/bukan-uuid')
        .set('Authorization', `Bearer ${accessTokenA}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Ownership antar user', () => {
    it('register & login user B', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: emailB, password });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailB, password });

      accessTokenB = res.body.data.accessToken;
    });

    it('user B tidak bisa melihat task user A → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tasks/${taskIdA}`)
        .set('Authorization', `Bearer ${accessTokenB}`);

      expect(res.status).toBe(404);
    });

    it('user B tidak bisa mengubah task user A → 404', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskIdA}`)
        .set('Authorization', `Bearer ${accessTokenB}`)
        .send({ title: 'Hack percobaan' });

      expect(res.status).toBe(404);
    });

    it('user B tidak bisa menghapus task user A → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/tasks/${taskIdA}`)
        .set('Authorization', `Bearer ${accessTokenB}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Refresh token rotation & logout', () => {
    let newRefreshTokenA: string;

    it('refresh berhasil, dapat token baru', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.refreshToken).not.toBe(refreshTokenA);

      newRefreshTokenA = res.body.data.refreshToken;
      accessTokenA = res.body.data.accessToken;
    });

    it('refresh token lama (sudah dirotasi) tidak berlaku lagi → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshTokenA}`);

      expect(res.status).toBe(401);
    });

    it('logout berhasil', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessTokenA}`);

      expect(res.status).toBe(200);
    });

    it('refresh setelah logout → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${newRefreshTokenA}`);

      expect(res.status).toBe(401);
    });
  });

  describe('Cleanup fungsional', () => {
    it('login ulang user A dan hapus task yang tersisa', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: emailA, password });

      const token = loginRes.body.data.accessToken;

      const res = await request(app.getHttpServer())
        .delete(`/tasks/${taskIdA}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
