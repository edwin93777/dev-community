import { SetMetadata } from '@nestjs/common';
import type { RoleName } from '../../modules/roles/entities/role.entity.js';

export const ROLES_KEY = 'roles';

/**
 * Declara los roles autorizados para un controlador o una ruta.
 * Se consume junto con `RolesGuard`.
 *
 * @example
 * @Roles(RoleName.ADMIN, RoleName.MODERADOR)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
