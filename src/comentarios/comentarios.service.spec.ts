import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { RoleName } from '../modules/roles/entities/role.entity.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { ComentariosService } from './comentarios.service.js';
import { Comentario } from './entities/comentario.entity.js';
import { Post } from '../modules/posts/entities/post.entity.js';

type Mock = ReturnType<typeof vi.fn>;

describe('ComentariosService', () => {
  let service: ComentariosService;
  let comentariosRepository: {
    create: Mock;
    save: Mock;
    find: Mock;
    findOne: Mock;
    delete: Mock;
  };
  let publicacionesRepository: { findOne: Mock };

  const crearUsuario = (
    id: string,
    rol: RoleName = RoleName.USUARIO,
  ): AuthenticatedUser => ({
    id,
    nombre: `Usuario ${id}`,
    correo: `usuario${id}@example.com`,
    rol,
  });

  const construirComentario = (
    cambios: Partial<Comentario> = {},
  ): Comentario =>
    ({
      id: '20',
      publicacionId: '10',
      autorId: '1',
      contenido: 'Comentario original',
      creadoEn: new Date('2026-01-01T00:00:00.000Z'),
      actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
      autor: { id: '1', nombre: 'Usuario 1' },
      ...cambios,
    }) as Comentario;

  beforeEach(() => {
    vi.clearAllMocks();

    comentariosRepository = {
      create: vi.fn((datos: Partial<Comentario>) => ({ ...datos })),
      save: vi.fn(async (comentario: Comentario) => comentario),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    publicacionesRepository = {
      findOne: vi.fn().mockResolvedValue({ id: '10' }),
    };

    service = new ComentariosService(
      comentariosRepository as unknown as Repository<Comentario>,
      publicacionesRepository as unknown as Repository<Post>,
    );
  });

  describe('crear', () => {
    it('crea un comentario válido con el autor autenticado', async () => {
      const usuario = crearUsuario('1');
      const dto: CrearComentarioDto = { contenido: 'Un comentario nuevo' };
      comentariosRepository.save.mockImplementation(
        async (comentario: Comentario) =>
          construirComentario({ ...comentario, id: '21' }),
      );

      const respuesta = await service.crear('10', dto, usuario);

      expect(comentariosRepository.create).toHaveBeenCalledWith({
        contenido: 'Un comentario nuevo',
        autorId: '1',
        publicacionId: '10',
      });
      expect(respuesta.autor).toEqual({ id: '1', nombre: 'Usuario 1' });
      expect(respuesta).not.toHaveProperty('correo');
    });

    it('devuelve 404 si la publicación no existe', async () => {
      publicacionesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.crear('999', { contenido: 'Texto' }, crearUsuario('1')),
      ).rejects.toThrow(NotFoundException);
      expect(comentariosRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('listarPorPublicacion', () => {
    it('lista los comentarios por fecha ascendente sin exponer datos sensibles', async () => {
      comentariosRepository.find.mockResolvedValue([
        construirComentario({
          autor: {
            id: '1',
            nombre: 'Usuario 1',
            correo: 'privado@example.com',
            passwordHash: 'secreto',
          } as Comentario['autor'],
        }),
      ]);

      const respuesta = await service.listarPorPublicacion('10');

      expect(comentariosRepository.find).toHaveBeenCalledWith({
        where: { publicacionId: '10' },
        relations: { autor: true },
        order: { creadoEn: 'ASC' },
      });
      expect(respuesta[0].autor).toEqual({ id: '1', nombre: 'Usuario 1' });
      expect(respuesta[0]).not.toHaveProperty('correo');
      expect(JSON.stringify(respuesta)).not.toContain('secreto');
    });

    it('devuelve 404 si la publicación no existe', async () => {
      publicacionesRepository.findOne.mockResolvedValue(null);

      await expect(service.listarPorPublicacion('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(comentariosRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('permite editar al autor', async () => {
      comentariosRepository.findOne.mockResolvedValue(construirComentario());

      const respuesta = await service.actualizar(
        '20',
        { contenido: 'Contenido corregido' },
        crearUsuario('1'),
      );

      expect(comentariosRepository.save).toHaveBeenCalled();
      expect(respuesta.contenido).toBe('Contenido corregido');
    });

    it('deniega la edición a un usuario ajeno', async () => {
      comentariosRepository.findOne.mockResolvedValue(construirComentario());

      await expect(
        service.actualizar(
          '20',
          { contenido: 'Cambio ajeno' },
          crearUsuario('2'),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(comentariosRepository.save).not.toHaveBeenCalled();
    });

    it.each([RoleName.ADMIN, RoleName.MODERADOR])(
      'deniega la edición a un %s aunque sea ajeno',
      async (rol) => {
        comentariosRepository.findOne.mockResolvedValue(
          construirComentario(),
        );

        await expect(
          service.actualizar(
            '20',
            { contenido: 'Cambio privilegiado' },
            crearUsuario('2', rol),
          ),
        ).rejects.toThrow(ForbiddenException);
      },
    );

    it('devuelve 404 si el comentario no existe', async () => {
      await expect(
        service.actualizar(
          '999',
          { contenido: 'Texto' },
          crearUsuario('1'),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('eliminar', () => {
    it('permite eliminar al autor', async () => {
      comentariosRepository.findOne.mockResolvedValue(construirComentario());

      await service.eliminar('20', crearUsuario('1'));

      expect(comentariosRepository.delete).toHaveBeenCalledWith({ id: '20' });
    });

    it('permite a un MODERADOR eliminar un comentario ajeno', async () => {
      comentariosRepository.findOne.mockResolvedValue(construirComentario());

      await service.eliminar('20', crearUsuario('2', RoleName.MODERADOR));

      expect(comentariosRepository.delete).toHaveBeenCalledWith({ id: '20' });
    });

    it.each([RoleName.USUARIO, RoleName.ADMIN])(
      'deniega a %s eliminar un comentario ajeno',
      async (rol) => {
        comentariosRepository.findOne.mockResolvedValue(
          construirComentario(),
        );

        await expect(
          service.eliminar('20', crearUsuario('2', rol)),
        ).rejects.toThrow(ForbiddenException);
        expect(comentariosRepository.delete).not.toHaveBeenCalled();
      },
    );

    it('devuelve 404 si el comentario no existe', async () => {
      await expect(service.eliminar('999', crearUsuario('1'))).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});