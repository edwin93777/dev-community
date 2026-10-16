import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import type { RoleName } from '../../modules/roles/entities/role.entity.js';

/**
 * Autoriza el acceso según los roles declarados con `@Roles()`.
 *
 * - Si la ruta no declara roles, no bloquea la petición (las reglas de
 *   propiedad del recurso son responsabilidad de cada servicio).
 * - Requiere que `JwtAuthGuard` haya ejecutado antes y dejado `request.user`.
 * - Devuelve `403 Forbidden` cuando el rol autenticado no está permitido.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      RoleName[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.rol)) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción.',
      );
    }

    return true;
  }
}
