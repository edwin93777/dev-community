import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { RoleName } from '../../roles/entities/role.entity.js';
import type { Post } from '../entities/post.entity.js';
import { PostAuthorizationPolicy } from './post-authorization.policy.js';

describe('PostAuthorizationPolicy', () => {
  const policy = new PostAuthorizationPolicy();

  const user = (id: string, rol: RoleName): AuthenticatedUser => ({
    id,
    nombre: `Usuario ${id}`,
    correo: `user${id}@example.com`,
    rol,
  });

  const post = (autorId: string): Post =>
    ({ id: '10', autorId, titulo: 'Título', contenido: 'Contenido' }) as Post;

  const autor = user('1', RoleName.USUARIO);
  const otroUsuario = user('2', RoleName.USUARIO);
  const moderador = user('3', RoleName.MODERADOR);
  const admin = user('4', RoleName.ADMIN);
  const publicacionPropia = post('1');
  const publicacionAjena = post('9');

  describe('canEdit (HU-05)', () => {
    it('permite editar su propia publicación a un USUARIO', () => {
      expect(policy.canEdit(autor, publicacionPropia)).toBe(true);
    });

    it('permite editar su propia publicación a un MODERADOR', () => {
      expect(policy.canEdit(moderador, post('3'))).toBe(true);
    });

    it('permite editar su propia publicación a un ADMIN', () => {
      expect(policy.canEdit(admin, post('4'))).toBe(true);
    });

    it('impide a un USUARIO editar una publicación ajena', () => {
      expect(policy.canEdit(otroUsuario, publicacionPropia)).toBe(false);
    });

    it('impide a un MODERADOR editar una publicación ajena', () => {
      expect(policy.canEdit(moderador, publicacionPropia)).toBe(false);
    });

    it('permite a un ADMIN editar una publicación ajena', () => {
      expect(policy.canEdit(admin, publicacionPropia)).toBe(true);
    });
  });

  describe('canDelete (HU-06)', () => {
    it('permite a un USUARIO eliminar su propia publicación', () => {
      expect(policy.canDelete(autor, publicacionPropia)).toBe(true);
    });

    it('impide a un USUARIO eliminar una publicación ajena', () => {
      expect(policy.canDelete(otroUsuario, publicacionPropia)).toBe(false);
    });

    it('permite a un MODERADOR eliminar una publicación ajena', () => {
      expect(policy.canDelete(moderador, publicacionPropia)).toBe(true);
    });

    it('permite a un ADMIN eliminar una publicación ajena', () => {
      expect(policy.canDelete(admin, publicacionPropia)).toBe(true);
    });

    it('permite a un MODERADOR eliminar su propia publicación', () => {
      expect(policy.canDelete(moderador, post('3'))).toBe(true);
    });

    it('impide eliminar la publicación de otro usuario con rol USUARIO', () => {
      expect(policy.canDelete(otroUsuario, publicacionAjena)).toBe(false);
    });
  });
});
