import {
  Controller,
  Get,
  INestApplication,
  Module,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { CurrentUser } from '../src/common/decorators/current-user.decorator.js';
import { Roles } from '../src/common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface.js';
import { RoleName } from '../src/modules/roles/entities/role.entity.js';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy.js';
import { User } from '../src/modules/users/entities/user.entity.js';

const TEST_SECRET = 'test-secret-with-enough-length-1234567890';

const usersRepository = { findOne: vi.fn() };

const dbUser = (rol: RoleName, activo = true) => ({
  id: '1',
  nombre: 'Ada Lovelace',
  correo: 'ada@example.com',
  activo,
  rol: { id: 1, nombre: rol },
});

@Controller('probe')
class GuardsProbeController {
  @Get('publico')
  publico() {
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('privado')
  privado(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('solo-admin')
  soloAdmin() {
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MODERADOR)
  @Get('moderacion')
  moderacion() {
    return { ok: true };
  }
}

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: TEST_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [GuardsProbeController],
  providers: [
    JwtStrategy,
    { provide: ConfigService, useValue: { getOrThrow: () => TEST_SECRET } },
    { provide: getRepositoryToken(User), useValue: usersRepository },
  ],
})
class GuardsProbeModule {}

describe('AuthGuard y RolesGuard (HTTP)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const signToken = (rol: RoleName, options?: { expiresIn: string }) =>
    jwtService.sign(
      { sub: '1', correo: 'ada@example.com', rol },
      options ?? {},
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GuardsProbeModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    usersRepository.findOne.mockResolvedValue(dbUser(RoleName.ADMIN));
  });

  it('permite el acceso a una ruta pública sin token', async () => {
    await request(app.getHttpServer()).get('/probe/publico').expect(200);
  });

  it('permite el acceso a una ruta protegida con un JWT válido', async () => {
    const response = await request(app.getHttpServer())
      .get('/probe/privado')
      .set('Authorization', `Bearer ${signToken(RoleName.ADMIN)}`)
      .expect(200);

    expect(response.body).toEqual({
      id: '1',
      nombre: 'Ada Lovelace',
      correo: 'ada@example.com',
      rol: RoleName.ADMIN,
    });
  });

  it('rechaza con 401 cuando no se envía token', async () => {
    await request(app.getHttpServer()).get('/probe/privado').expect(401);
  });

  it('rechaza con 401 cuando el token es inválido', async () => {
    await request(app.getHttpServer())
      .get('/probe/privado')
      .set('Authorization', 'Bearer token.invalido.firma')
      .expect(401);
  });

  it('rechaza con 401 cuando el token está expirado', async () => {
    const expired = signToken(RoleName.ADMIN, { expiresIn: '-1s' });

    await request(app.getHttpServer())
      .get('/probe/privado')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('rechaza con 401 cuando el usuario del token ya no existe', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/probe/privado')
      .set('Authorization', `Bearer ${signToken(RoleName.ADMIN)}`)
      .expect(401);
  });

  it('permite el acceso cuando el rol está autorizado', async () => {
    await request(app.getHttpServer())
      .get('/probe/solo-admin')
      .set('Authorization', `Bearer ${signToken(RoleName.ADMIN)}`)
      .expect(200);
  });

  it('rechaza con 403 cuando el rol no está autorizado', async () => {
    usersRepository.findOne.mockResolvedValue(dbUser(RoleName.USUARIO));

    await request(app.getHttpServer())
      .get('/probe/solo-admin')
      .set('Authorization', `Bearer ${signToken(RoleName.USUARIO)}`)
      .expect(403);
  });

  it('permite múltiples roles declarados con @Roles()', async () => {
    usersRepository.findOne.mockResolvedValue(dbUser(RoleName.MODERADOR));

    await request(app.getHttpServer())
      .get('/probe/moderacion')
      .set('Authorization', `Bearer ${signToken(RoleName.MODERADOR)}`)
      .expect(200);
  });

  it('rechaza con 403 a un USUARIO en una ruta de moderación', async () => {
    usersRepository.findOne.mockResolvedValue(dbUser(RoleName.USUARIO));

    await request(app.getHttpServer())
      .get('/probe/moderacion')
      .set('Authorization', `Bearer ${signToken(RoleName.USUARIO)}`)
      .expect(403);
  });
});
