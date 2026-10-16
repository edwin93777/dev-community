import {
  ConflictException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

describe('AuthController (HTTP)', () => {
  let app: INestApplication;
  const authService = {
    register: vi.fn(),
    login: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = moduleRef.createNestApplication();
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    const validBody = {
      nombre: 'Ada Lovelace',
      correo: 'ada@example.com',
      password: 'ContraseñaSegura123',
    };

    it('responde 201 con los datos públicos del usuario', async () => {
      authService.register.mockResolvedValue({
        id: '1',
        nombre: 'Ada Lovelace',
        correo: 'ada@example.com',
        rol: 'USUARIO',
        activo: true,
        creadoEn: new Date('2026-01-01T00:00:00Z'),
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validBody)
        .expect(201);

      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(authService.register).toHaveBeenCalledWith(validBody);
    });

    it('responde 409 cuando el correo ya existe', async () => {
      authService.register.mockRejectedValue(
        new ConflictException('El correo ya está registrado.'),
      );

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(validBody)
        .expect(409);
    });

    it('responde 400 cuando el email es inválido', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validBody, correo: 'no-es-un-email' })
        .expect(400);

      expect(authService.register).not.toHaveBeenCalled();
    });

    it('responde 400 cuando faltan campos obligatorios', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ correo: 'ada@example.com' })
        .expect(400);

      expect(authService.register).not.toHaveBeenCalled();
    });

    it('responde 400 e ignora intentos de asignar roles (rol)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validBody, rol: 'ADMIN' })
        .expect(400);

      expect(authService.register).not.toHaveBeenCalled();
    });

    it('responde 400 e ignora intentos de asignar rolId', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validBody, rolId: 1 })
        .expect(400);

      expect(authService.register).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    const validBody = {
      correo: 'ada@example.com',
      password: 'ContraseñaSegura123',
    };

    it('responde 200 con el access_token', async () => {
      authService.login.mockResolvedValue({ access_token: 'signed.jwt.token' });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validBody)
        .expect(200);

      expect(response.body).toEqual({ access_token: 'signed.jwt.token' });
    });

    it('responde 401 con credenciales incorrectas', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException('Credenciales inválidas.'),
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(validBody)
        .expect(401);
    });

    it('responde 400 cuando el cuerpo es inválido', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo: 'ada@example.com' })
        .expect(400);

      expect(authService.login).not.toHaveBeenCalled();
    });
  });
});
