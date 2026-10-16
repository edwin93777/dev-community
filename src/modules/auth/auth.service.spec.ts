import {
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, RoleName } from '../roles/entities/role.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let rolesRepository: { findOne: ReturnType<typeof vi.fn> };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };

  const usuarioRole = { id: 3, nombre: RoleName.USUARIO } as Role;

  beforeEach(() => {
    usersRepository = {
      findOne: vi.fn(),
      create: vi.fn((entity: Partial<User>) => entity),
      save: vi.fn(async (entity: Partial<User>) => ({
        ...entity,
        id: '1',
        activo: true,
        creadoEn: new Date('2026-01-01T00:00:00Z'),
      })),
    };
    rolesRepository = { findOne: vi.fn() };
    jwtService = { signAsync: vi.fn().mockResolvedValue('signed.jwt.token') };

    service = new AuthService(
      usersRepository as never,
      rolesRepository as never,
      jwtService as never,
    );
  });

  describe('register', () => {
    it('registra un usuario con hash bcrypt y rol USUARIO', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(usuarioRole);

      const result = await service.register({
        nombre: 'Ada Lovelace',
        correo: 'ada@example.com',
        password: 'ContraseñaSegura123',
      });

      expect(rolesRepository.findOne).toHaveBeenCalledWith({
        where: { nombre: RoleName.USUARIO },
      });
      expect(usersRepository.save).toHaveBeenCalledTimes(1);

      const savedEntity = usersRepository.save.mock.calls[0][0] as User;
      expect(savedEntity.passwordHash).not.toBe('ContraseñaSegura123');
      expect(savedEntity.passwordHash).toMatch(/^\$2[aby]\$/);
      await expect(
        bcrypt.compare('ContraseñaSegura123', savedEntity.passwordHash),
      ).resolves.toBe(true);
      expect(savedEntity.rolId).toBe(usuarioRole.id);

      expect(result.rol).toBe(RoleName.USUARIO);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password');
    });

    it('normaliza el correo a minúsculas para evitar duplicados', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(usuarioRole);

      await service.register({
        nombre: 'Ada',
        correo: '  ADA@Example.COM ',
        password: 'ContraseñaSegura123',
      });

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { correo: 'ada@example.com' },
      });
      expect(usersRepository.save.mock.calls[0][0]).toMatchObject({
        correo: 'ada@example.com',
      });
    });

    it('rechaza con 409 cuando el correo ya está registrado', async () => {
      usersRepository.findOne.mockResolvedValue({ id: '1' } as User);

      await expect(
        service.register({
          nombre: 'Ada',
          correo: 'ada@example.com',
          password: 'ContraseñaSegura123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(rolesRepository.findOne).not.toHaveBeenCalled();
    });

    it('falla si el rol USUARIO no está configurado', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.register({
          nombre: 'Ada',
          correo: 'ada@example.com',
          password: 'ContraseñaSegura123',
        }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('login', () => {
    const passwordHash = bcrypt.hashSync('ContraseñaSegura123', 10);

    it('devuelve un access_token con el payload esperado', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: '7',
        nombre: 'Ada',
        correo: 'ada@example.com',
        passwordHash,
        activo: true,
        rol: usuarioRole,
      } as User);

      const result = await service.login({
        correo: 'ada@example.com',
        password: 'ContraseñaSegura123',
      });

      expect(result).toEqual({ access_token: 'signed.jwt.token' });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: '7',
        correo: 'ada@example.com',
        rol: RoleName.USUARIO,
      });
    });

    it('rechaza con 401 cuando la contraseña es incorrecta', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: '7',
        correo: 'ada@example.com',
        passwordHash,
        activo: true,
        rol: usuarioRole,
      } as User);

      await expect(
        service.login({
          correo: 'ada@example.com',
          password: 'Incorrecta123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rechaza con 401 cuando el usuario no existe', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({
          correo: 'nadie@example.com',
          password: 'ContraseñaSegura123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza con 401 cuando el usuario está inactivo', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: '7',
        correo: 'ada@example.com',
        passwordHash,
        activo: false,
        rol: usuarioRole,
      } as User);

      await expect(
        service.login({
          correo: 'ada@example.com',
          password: 'ContraseñaSegura123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
