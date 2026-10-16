import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Role, RoleName } from '../../roles/entities/role.entity.js';
import { User } from '../../users/entities/user.entity.js';
import type { Repository } from 'typeorm';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersRepository: { findOne: ReturnType<typeof vi.fn> };

  const config = {
    getOrThrow: vi.fn().mockReturnValue('test-secret'),
  } as unknown as ConfigService;

  beforeEach(() => {
    usersRepository = { findOne: vi.fn() };
    strategy = new JwtStrategy(
      config,
      usersRepository as unknown as Repository<User>,
    );
  });

  it('devuelve la identidad autenticada para un usuario activo', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: '7',
      nombre: 'Ada',
      correo: 'ada@example.com',
      activo: true,
      rol: { id: 1, nombre: RoleName.ADMIN } as Role,
    } as User);

    await expect(
      strategy.validate({
        sub: '7',
        correo: 'ada@example.com',
        rol: RoleName.ADMIN,
      }),
    ).resolves.toEqual({
      id: '7',
      nombre: 'Ada',
      correo: 'ada@example.com',
      rol: RoleName.ADMIN,
    });

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { id: '7' },
      relations: { rol: true },
    });
  });

  it('lanza 401 cuando el usuario no existe', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: '999',
        correo: 'nadie@example.com',
        rol: RoleName.USUARIO,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lanza 401 cuando el usuario está inactivo', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: '7',
      activo: false,
      rol: { id: 3, nombre: RoleName.USUARIO } as Role,
    } as User);

    await expect(
      strategy.validate({
        sub: '7',
        correo: 'ada@example.com',
        rol: RoleName.USUARIO,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
