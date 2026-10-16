import type { RoleName } from '../../modules/roles/entities/role.entity.js';

/**
 * Identidad autenticada que `JwtStrategy` publica en `request.user`.
 * Incluye el nombre del rol para que `RolesGuard` pueda autorizar sin
 * consultas adicionales a la base de datos.
 */
export interface AuthenticatedUser {
  id: string;
  nombre: string;
  correo: string;
  rol: RoleName;
}
