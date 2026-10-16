import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { RoleName } from '../../roles/entities/role.entity.js';
import type { Post } from '../entities/post.entity.js';

/**
 * Autorización por propiedad sobre una publicación (HU-05 y HU-06).
 *
 * Se complementa con `JwtAuthGuard` (autenticación) y `RolesGuard`
 * (autorización por rol a nivel de ruta): aquí se resuelve la tercera capa,
 * si el usuario autenticado concreto puede actuar sobre la publicación
 * consultada en la base de datos.
 *
 * Matriz de permisos:
 * - Editar: autor o ADMIN (MODERADOR no puede editar publicaciones ajenas).
 * - Eliminar: autor, MODERADOR o ADMIN.
 */
@Injectable()
export class PostAuthorizationPolicy {
  canEdit(user: AuthenticatedUser, post: Post): boolean {
    return this.isAuthor(user, post) || user.rol === RoleName.ADMIN;
  }

  canDelete(user: AuthenticatedUser, post: Post): boolean {
    return (
      this.isAuthor(user, post) ||
      user.rol === RoleName.MODERADOR ||
      user.rol === RoleName.ADMIN
    );
  }

  private isAuthor(user: AuthenticatedUser, post: Post): boolean {
    return String(user.id) === String(post.autorId);
  }
}
