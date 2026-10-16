import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import { RoleName } from '../../modules/roles/entities/role.entity.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let guard: RolesGuard;

  const handler = (): void => undefined;
  const controller = class TestController {};

  const createContext = (user?: AuthenticatedUser): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const usuario: AuthenticatedUser = {
    id: '1',
    nombre: 'Ada',
    correo: 'ada@example.com',
    rol: RoleName.USUARIO,
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('permite el acceso cuando la ruta no declara roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('permite el acceso cuando la lista de roles está vacía', () => {
    reflector.getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('lee los metadatos del handler y del controlador', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleName.USUARIO]);

    expect(guard.canActivate(createContext(usuario))).toBe(true);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      controller,
    ]);
  });

  it('permite el acceso cuando el rol del usuario está autorizado', () => {
    reflector.getAllAndOverride.mockReturnValue([
      RoleName.ADMIN,
      RoleName.USUARIO,
    ]);

    expect(guard.canActivate(createContext(usuario))).toBe(true);
  });

  it('lanza 403 cuando el rol del usuario no está autorizado', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleName.ADMIN]);

    expect(() => guard.canActivate(createContext(usuario))).toThrow(
      ForbiddenException,
    );
  });

  it('lanza 403 cuando no hay usuario autenticado', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleName.ADMIN]);

    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
