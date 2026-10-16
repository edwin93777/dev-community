import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { Comment } from '../comments/entities/comment.entity.js';
import { Reaction } from '../reactions/entities/reaction.entity.js';
import { RoleName } from '../roles/entities/role.entity.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { Post } from './entities/post.entity.js';
import { PostAuthorizationPolicy } from './policies/post-authorization.policy.js';
import { PostsService } from './posts.service.js';

type Mock = ReturnType<typeof vi.fn>;

describe('PostsService', () => {
  let service: PostsService;
  let postsRepository: {
    create: Mock;
    save: Mock;
    find: Mock;
    findOne: Mock;
    manager: { transaction: Mock };
  };
  let txManager: { delete: Mock };

  const autor: AuthenticatedUser = {
    id: '1',
    nombre: 'Ada Lovelace',
    correo: 'ada@example.com',
    rol: RoleName.USUARIO,
  };

  const buildPost = (overrides: Record<string, unknown> = {}): Post =>
    ({
      id: '10',
      autorId: '1',
      titulo: 'Título original',
      contenido: 'Contenido original',
      creadoEn: new Date('2026-01-01T00:00:00.000Z'),
      actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
      autor: { id: '1', nombre: 'Ada Lovelace' },
      ...overrides,
    }) as unknown as Post;

  beforeEach(() => {
    vi.clearAllMocks();

    txManager = { delete: vi.fn().mockResolvedValue({ affected: 1 }) };

    postsRepository = {
      create: vi.fn((data: Partial<Post>) => ({ ...data })),
      save: vi.fn(async (entity: Post) => entity),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      manager: {
        transaction: vi.fn(async (cb: (m: typeof txManager) => unknown) =>
          cb(txManager),
        ),
      },
    };

    service = new PostsService(
      postsRepository as unknown as Repository<Post>,
      new PostAuthorizationPolicy(),
    );
  });

  describe('create (HU-04)', () => {
    const dto: CreatePostDto = { titulo: 'Mi publicación', contenido: 'Cuerpo' };

    it('asocia la publicación al usuario autenticado mediante el JWT', async () => {
      const saved = buildPost();
      postsRepository.save.mockResolvedValue(saved);
      postsRepository.findOne.mockResolvedValue(saved);

      const result = await service.create(dto, autor);

      expect(postsRepository.create).toHaveBeenCalledWith({
        titulo: 'Mi publicación',
        contenido: 'Cuerpo',
        autorId: '1',
      });
      expect(result.autor).toEqual({ id: '1', nombre: 'Ada Lovelace' });
      expect(result.id).toBe('10');
      expect(result.creadoEn).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });

    it('ignora la autoría enviada por el cliente', async () => {
      const saved = buildPost({ autorId: '1' });
      postsRepository.save.mockResolvedValue(saved);
      postsRepository.findOne.mockResolvedValue(saved);

      const malicioso = {
        titulo: 'Mi publicación',
        contenido: 'Cuerpo',
        autorId: '99',
        autor: { id: '99', nombre: 'Otro' },
      } as unknown as CreatePostDto;

      await service.create(malicioso, autor);

      const data = postsRepository.create.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(data.autorId).toBe('1');
      expect(data).not.toHaveProperty('autor');
    });

    it('no expone datos sensibles del usuario', async () => {
      const saved = buildPost({
        autor: {
          id: '1',
          nombre: 'Ada Lovelace',
          correo: 'ada@example.com',
          passwordHash: '$2b$10$secreto',
        },
      });
      postsRepository.save.mockResolvedValue(saved);
      postsRepository.findOne.mockResolvedValue(saved);

      const result = await service.create(dto, autor);

      expect(result.autor).toEqual({ id: '1', nombre: 'Ada Lovelace' });
      expect(JSON.stringify(result)).not.toContain('passwordHash');
      expect(JSON.stringify(result)).not.toContain('$2b$10$');
      expect(result.autor).not.toHaveProperty('correo');
    });

    it('consulta la publicación persistida antes de responder', async () => {
      const saved = buildPost();
      postsRepository.save.mockResolvedValue(saved);
      postsRepository.findOne.mockResolvedValue(saved);

      await service.create(dto, autor);

      expect(postsRepository.findOne).toHaveBeenCalledWith({
        where: { id: '10' },
        relations: { autor: true },
      });
    });
  });

  describe('findAll (HU-04)', () => {
    it('consulta las publicaciones ordenadas de más reciente a más antigua', async () => {
      postsRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(postsRepository.find).toHaveBeenCalledWith({
        relations: { autor: true },
        order: { creadoEn: 'DESC' },
      });
      expect(result).toEqual([]);
    });

    it('devuelve una lista vacía cuando no existen publicaciones', async () => {
      postsRepository.find.mockResolvedValue([]);

      expect(await service.findAll()).toEqual([]);
    });

    it('devuelve el mapeo público de cada publicación', async () => {
      postsRepository.find.mockResolvedValue([
        buildPost(),
        buildPost({ id: '11', titulo: 'Otra' }),
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '10',
        titulo: 'Título original',
        contenido: 'Contenido original',
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
        autor: { id: '1', nombre: 'Ada Lovelace' },
      });
      expect(result[0]).not.toHaveProperty('autorId');
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('findOne (HU-04)', () => {
    it('devuelve la publicación encontrada', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost());

      const result = await service.findOne('10');

      expect(result.id).toBe('10');
      expect(result.autor).toEqual({ id: '1', nombre: 'Ada Lovelace' });
    });

    it('lanza 404 cuando la publicación no existe', async () => {
      postsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });

    it('lanza 400 cuando el identificador no es numérico', async () => {
      await expect(service.findOne('abc')).rejects.toThrow(BadRequestException);
      expect(postsRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('update (HU-05)', () => {
    it('permite al autor editar su publicación', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost());

      const result = await service.update(
        '10',
        { titulo: 'Título corregido' },
        autor,
      );

      expect(result.titulo).toBe('Título corregido');
      expect(postsRepository.save).toHaveBeenCalled();
    });

    it('permite a un ADMIN editar una publicación ajena', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost({ autorId: '2' }));

      const result = await service.update(
        '10',
        { contenido: 'Editado por ADMIN' },
        { ...autor, id: '9', rol: RoleName.ADMIN },
      );

      expect(result.contenido).toBe('Editado por ADMIN');
    });

    it('impide a un USUARIO editar una publicación ajena', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost({ autorId: '2' }));

      await expect(
        service.update('10', { titulo: 'Hack' }, autor),
      ).rejects.toThrow(ForbiddenException);
      expect(postsRepository.save).not.toHaveBeenCalled();
    });

    it('impide a un MODERADOR editar una publicación ajena', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost({ autorId: '2' }));

      await expect(
        service.update(
          '10',
          { titulo: 'Moderado' },
          { ...autor, rol: RoleName.MODERADOR },
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(postsRepository.save).not.toHaveBeenCalled();
    });

    it('permite una actualización parcial sin perder los campos no enviados', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost());

      const result = await service.update(
        '10',
        { contenido: 'Contenido nuevo' },
        autor,
      );

      expect(result.titulo).toBe('Título original');
      expect(result.contenido).toBe('Contenido nuevo');
    });

    it('no permite modificar el autor ni la fecha de creación', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost());

      const dto = {
        titulo: 'Nuevo título',
        autorId: '99',
        autor: { id: '99', nombre: 'Otro' },
        creadoEn: new Date('2000-01-01T00:00:00.000Z'),
      } as unknown as UpdatePostDto;

      const result = await service.update('10', dto, autor);

      const saved = postsRepository.save.mock.calls[0][0] as Post;
      expect(saved.autorId).toBe('1');
      expect(saved.creadoEn).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(result.autor).toEqual({ id: '1', nombre: 'Ada Lovelace' });
    });

    it('lanza 404 cuando la publicación no existe', async () => {
      postsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('999', { titulo: 'X' }, autor),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (HU-06)', () => {
    it('permite al autor eliminar su publicación', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost());

      await expect(service.remove('10', autor)).resolves.toBeUndefined();
      expect(postsRepository.manager.transaction).toHaveBeenCalled();
    });

    it('permite a un MODERADOR eliminar una publicación ajena', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost({ autorId: '2' }));

      await expect(
        service.remove('10', { ...autor, rol: RoleName.MODERADOR }),
      ).resolves.toBeUndefined();
    });

    it('permite a un ADMIN eliminar una publicación ajena', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost({ autorId: '2' }));

      await expect(
        service.remove('10', { ...autor, id: '9', rol: RoleName.ADMIN }),
      ).resolves.toBeUndefined();
    });

    it('impide a un USUARIO eliminar una publicación ajena', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost({ autorId: '2' }));

      await expect(service.remove('10', autor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(postsRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('lanza 404 y no abre transacción cuando la publicación no existe', async () => {
      postsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('999', autor)).rejects.toThrow(
        NotFoundException,
      );
      expect(postsRepository.manager.transaction).not.toHaveBeenCalled();
    });

    it('elimina comentarios, reacciones y la publicación en una transacción', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost());

      await service.remove('10', autor);

      expect(txManager.delete).toHaveBeenCalledWith(Reaction, {
        publicacionId: '10',
      });
      expect(txManager.delete).toHaveBeenCalledWith(Comment, {
        publicacionId: '10',
      });
      expect(txManager.delete).toHaveBeenCalledWith(Post, { id: '10' });
      expect(txManager.delete).toHaveBeenCalledTimes(3);

      const [reacciones, comentarios, publicacion] =
        txManager.delete.mock.calls.map((call) => call[0]);
      expect(
        txManager.delete.mock.invocationCallOrder[0],
      ).toBeLessThan(txManager.delete.mock.invocationCallOrder[2]);
      expect([reacciones, comentarios, publicacion]).toEqual([
        Reaction,
        Comment,
        Post,
      ]);
    });

    it('lanza 404 si la transacción no elimina la publicación', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost());
      txManager.delete
        .mockResolvedValueOnce({ affected: 0 })
        .mockResolvedValueOnce({ affected: 0 })
        .mockResolvedValueOnce({ affected: 0 });

      await expect(service.remove('10', autor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('convierte los errores inesperados de la base en un 500 sin exponer detalles', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost());
      postsRepository.manager.transaction.mockRejectedValue(
        new Error('ER_LOCK_DEADLOCK: simulado'),
      );

      const error = await service.remove('10', autor).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect((error as Error).message).not.toContain('ER_LOCK_DEADLOCK');
    });

    it('repropaga las excepciones HTTP generadas dentro de la transacción', async () => {
      postsRepository.findOne.mockResolvedValue(buildPost());
      postsRepository.manager.transaction.mockRejectedValue(
        new NotFoundException('Publicación no encontrada.'),
      );

      await expect(service.remove('10', autor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
