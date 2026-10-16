import {
  INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy.js';
import { Comment } from '../src/modules/comments/entities/comment.entity.js';
import { Post } from '../src/modules/posts/entities/post.entity.js';
import { PostsController } from '../src/modules/posts/posts.controller.js';
import { PostsService } from '../src/modules/posts/posts.service.js';
import { PostAuthorizationPolicy } from '../src/modules/posts/policies/post-authorization.policy.js';
import { Reaction } from '../src/modules/reactions/entities/reaction.entity.js';
import { RoleName } from '../src/modules/roles/entities/role.entity.js';
import { User } from '../src/modules/users/entities/user.entity.js';

const TEST_SECRET = 'test-secret-with-enough-length-1234567890';
const BASE_TIME = Date.parse('2026-01-01T00:00:00.000Z');

type StoredUser = {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
  passwordHash: string;
  rol: { id: number; nombre: RoleName };
};

type StoredPost = {
  id: string;
  autorId: string;
  titulo: string;
  contenido: string;
  creadoEn: Date;
  actualizadoEn: Date;
};

type StoredComment = {
  id: string;
  publicacionId: string;
  autorId: string;
  contenido: string;
};

type StoredReaction = {
  id: string;
  usuarioId: string;
  publicacionId: string;
};

const db = {
  users: new Map<string, StoredUser>(),
  posts: [] as StoredPost[],
  comments: [] as StoredComment[],
  reactions: [] as StoredReaction[],
  seq: 1,
  transactions: 0,
};

const attachAutor = (post: StoredPost) => {
  const autor = db.users.get(post.autorId);
  return {
    ...post,
    autor: autor ? { id: autor.id, nombre: autor.nombre } : undefined,
  };
};

const postsRepository = {
  create: (data: Partial<StoredPost>) => ({ ...data }),
  save: async (entity: Partial<StoredPost> & { id?: string }) => {
    const id = entity.id ?? String(db.seq++);
    const existing = db.posts.find((post) => post.id === id);
    const now = new Date(BASE_TIME + db.seq * 1000);

    const stored: StoredPost = {
      id,
      autorId: String(entity.autorId),
      titulo: String(entity.titulo),
      contenido: String(entity.contenido),
      creadoEn: entity.creadoEn ?? now,
      actualizadoEn: now,
    };

    if (existing) {
      Object.assign(existing, stored);
      return attachAutor(existing);
    }

    db.posts.push(stored);
    return attachAutor(stored);
  },
  find: async () =>
    [...db.posts]
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime())
      .map(attachAutor),
  findOne: async (options?: { where?: { id?: string } }) => {
    const id = String(options?.where?.id);
    const post = db.posts.find((candidate) => candidate.id === id);
    return post ? attachAutor(post) : null;
  },
  manager: {
    transaction: async (
      cb: (manager: typeof queryManager) => Promise<unknown>,
    ) => {
      db.transactions += 1;
      return cb(queryManager);
    },
  },
};

const queryManager = {
  delete: async (
    entity: typeof Post | typeof Comment | typeof Reaction,
    criteria: { id?: string; publicacionId?: string },
  ) => {
    if (entity === Post) {
      const before = db.posts.length;
      db.posts = db.posts.filter((post) => post.id !== String(criteria.id));
      return { affected: before - db.posts.length };
    }

    if (entity === Comment) {
      const before = db.comments.length;
      db.comments = db.comments.filter(
        (comment) => comment.publicacionId !== String(criteria.publicacionId),
      );
      return { affected: before - db.comments.length };
    }

    const before = db.reactions.length;
    db.reactions = db.reactions.filter(
      (reaction) => reaction.publicacionId !== String(criteria.publicacionId),
    );
    return { affected: before - db.reactions.length };
  },
};

const usersRepository = { findOne: vi.fn() };

const seedUser = (id: string, nombre: string, rol: RoleName): StoredUser => {
  const user: StoredUser = {
    id,
    nombre,
    correo: `${nombre.toLowerCase().replace(' ', '.')}@example.com`,
    activo: true,
    passwordHash: '$2b$10$hashsecreto',
    rol: { id: rol === RoleName.ADMIN ? 1 : rol === RoleName.MODERADOR ? 2 : 3, nombre: rol },
  };
  db.users.set(id, user);
  return user;
};

const seedPost = (autorId: string, titulo = 'Título'): StoredPost => {
  const id = String(db.seq++);
  const post: StoredPost = {
    id,
    autorId,
    titulo,
    contenido: 'Contenido de la publicación',
    creadoEn: new Date(BASE_TIME + db.seq * 1000),
    actualizadoEn: new Date(BASE_TIME + db.seq * 1000),
  };
  db.posts.push(post);
  return post;
};

const seedComment = (publicacionId: string): StoredComment => {
  const comment: StoredComment = {
    id: String(db.seq++),
    publicacionId,
    autorId: '2',
    contenido: 'Un comentario',
  };
  db.comments.push(comment);
  return comment;
};

const seedReaction = (publicacionId: string): StoredReaction => {
  const reaction: StoredReaction = {
    id: String(db.seq++),
    usuarioId: '2',
    publicacionId,
  };
  db.reactions.push(reaction);
  return reaction;
};

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: TEST_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [PostsController],
  providers: [
    PostsService,
    PostAuthorizationPolicy,
    JwtStrategy,
    { provide: ConfigService, useValue: { getOrThrow: () => TEST_SECRET } },
    { provide: getRepositoryToken(User), useValue: usersRepository },
    { provide: getRepositoryToken(Post), useValue: postsRepository },
  ],
})
class PublicacionesTestModule {}

describe('Publicaciones (HU-04, HU-05, HU-06) - HTTP', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let ada: StoredUser;
  let grace: StoredUser;
  let moderador: StoredUser;
  let admin: StoredUser;

  const signToken = (user: StoredUser) =>
    jwtService.sign({
      sub: user.id,
      correo: user.correo,
      rol: user.rol.nombre,
    });

  const authAs = (user: StoredUser) => `Bearer ${signToken(user)}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PublicacionesTestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    db.users.clear();
    db.posts = [];
    db.comments = [];
    db.reactions = [];
    db.seq = 1;
    db.transactions = 0;

    ada = seedUser('1', 'Ada Lovelace', RoleName.USUARIO);
    grace = seedUser('2', 'Grace Hopper', RoleName.USUARIO);
    moderador = seedUser('3', 'Moderador Uno', RoleName.MODERADOR);
    admin = seedUser('4', 'Admin Uno', RoleName.ADMIN);

    usersRepository.findOne.mockImplementation(
      async (options: { where: { id: string } }) =>
        db.users.get(String(options.where.id)) ?? null,
    );
  });

  describe('HU-04: crear publicaciones', () => {
    it('1. crea una publicación con JWT válido (201)', async () => {
      const response = await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', authAs(ada))
        .send({ titulo: 'Mi primera publicación', contenido: 'Hola comunidad' })
        .expect(201);

      expect(response.body).toMatchObject({
        titulo: 'Mi primera publicación',
        contenido: 'Hola comunidad',
        autor: { id: '1', nombre: 'Ada Lovelace' },
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.creadoEn).toBeDefined();
      expect(db.posts).toHaveLength(1);
    });

    it('2. rechaza la creación sin autenticación (401)', async () => {
      await request(app.getHttpServer())
        .post('/publicaciones')
        .send({ titulo: 'Sin autor', contenido: 'Contenido' })
        .expect(401);

      expect(db.posts).toHaveLength(0);
    });

    it('3. rechaza una publicación sin título (400)', async () => {
      await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', authAs(ada))
        .send({ contenido: 'Contenido sin título' })
        .expect(400);

      expect(db.posts).toHaveLength(0);
    });

    it('4. rechaza una publicación sin contenido (400)', async () => {
      await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', authAs(ada))
        .send({ titulo: 'Título sin contenido' })
        .expect(400);

      expect(db.posts).toHaveLength(0);
    });

    it('rechaza títulos o contenidos compuestos solo por espacios (400)', async () => {
      await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', authAs(ada))
        .send({ titulo: '   ', contenido: 'Contenido' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', authAs(ada))
        .send({ titulo: 'Título', contenido: '   ' })
        .expect(400);

      expect(db.posts).toHaveLength(0);
    });

    it('5. asocia la publicación al usuario autenticado', async () => {
      const response = await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', authAs(grace))
        .send({ titulo: 'De Grace', contenido: 'Contenido de Grace' })
        .expect(201);

      expect(response.body.autor).toEqual({ id: '2', nombre: 'Grace Hopper' });
      expect(db.posts[0].autorId).toBe('2');
    });

    it('6. impide asignar arbitrariamente otro autor desde el cliente', async () => {
      const response = await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', authAs(ada))
        .send({
          titulo: 'Falso autor',
          contenido: 'Contenido',
          autorId: '2',
          autor: { id: '2', nombre: 'Grace Hopper' },
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.any(String)]),
      );
      expect(db.posts).toHaveLength(0);
    });

    it('no expone contraseñas ni hashes del usuario', async () => {
      const response = await request(app.getHttpServer())
        .post('/publicaciones')
        .set('Authorization', authAs(ada))
        .send({ titulo: 'Sin datos sensibles', contenido: 'Contenido' })
        .expect(201);

      expect(response.body.autor).toEqual({ id: '1', nombre: 'Ada Lovelace' });
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.text).not.toContain('hashsecreto');
      expect(response.text).not.toContain('password');
    });
  });

  describe('HU-04: consultar publicaciones', () => {
    it('8. devuelve una lista vacía cuando no hay publicaciones (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/publicaciones')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('7. lista las publicaciones existentes de más reciente a más antigua', async () => {
      const antigua = seedPost('1', 'Antigua');
      const reciente = seedPost('2', 'Reciente');

      const response = await request(app.getHttpServer())
        .get('/publicaciones')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        id: reciente.id,
        titulo: 'Reciente',
        autor: { id: '2', nombre: 'Grace Hopper' },
      });
      expect(response.body[1]).toMatchObject({
        id: antigua.id,
        titulo: 'Antigua',
        autor: { id: '1', nombre: 'Ada Lovelace' },
      });
      expect(response.text).not.toContain('password');
      expect(response.text).not.toContain('correo');
    });

    it('9. consulta una publicación por ID (200)', async () => {
      const post = seedPost('1', 'Detalle');

      const response = await request(app.getHttpServer())
        .get(`/publicaciones/${post.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: post.id,
        titulo: 'Detalle',
        contenido: 'Contenido de la publicación',
        creadoEn: post.creadoEn.toISOString(),
        autor: { id: '1', nombre: 'Ada Lovelace' },
      });
      expect(response.body).not.toHaveProperty('autorId');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('10. devuelve 404 para una publicación inexistente', async () => {
      await request(app.getHttpServer()).get('/publicaciones/999').expect(404);
    });

    it('11. rechaza identificadores inválidos con 400', async () => {
      for (const id of ['abc', '0', '-1', '12x', ' ']) {
        await request(app.getHttpServer())
          .get(`/publicaciones/${encodeURIComponent(id)}`)
          .expect(400);
      }
    });
  });

  describe('HU-05: editar publicaciones', () => {
    it('12. permite al autor editar su publicación (200)', async () => {
      const post = seedPost('1');

      const response = await request(app.getHttpServer())
        .patch(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(ada))
        .send({ titulo: 'Título corregido' })
        .expect(200);

      expect(response.body.titulo).toBe('Título corregido');
      expect(response.body.autor).toEqual({ id: '1', nombre: 'Ada Lovelace' });
      expect(db.posts[0].titulo).toBe('Título corregido');
    });

    it('13. permite a un ADMIN editar una publicación ajena (200)', async () => {
      const post = seedPost('1');

      await request(app.getHttpServer())
        .patch(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(admin))
        .send({ contenido: 'Editado por el ADMIN' })
        .expect(200);

      expect(db.posts[0].contenido).toBe('Editado por el ADMIN');
    });

    it('14. impide a un USUARIO editar una publicación ajena (403)', async () => {
      const post = seedPost('1');

      await request(app.getHttpServer())
        .patch(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(grace))
        .send({ titulo: 'Intento ajeno' })
        .expect(403);

      expect(db.posts[0].titulo).toBe('Título');
    });

    it('15. impide a un MODERADOR editar una publicación ajena (403)', async () => {
      const post = seedPost('1');

      await request(app.getHttpServer())
        .patch(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(moderador))
        .send({ titulo: 'Moderación indebida' })
        .expect(403);

      expect(db.posts[0].titulo).toBe('Título');
    });

    it('16. rechaza la edición sin autenticación (401)', async () => {
      const post = seedPost('1');

      await request(app.getHttpServer())
        .patch(`/publicaciones/${post.id}`)
        .send({ titulo: 'Sin sesión' })
        .expect(401);
    });

    it('17. rechaza datos inválidos (400)', async () => {
      const post = seedPost('1');

      await request(app.getHttpServer())
        .patch(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(ada))
        .send({ titulo: '   ' })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(ada))
        .send({ contenido: 42 })
        .expect(400);

      await request(app.getHttpServer())
        .patch('/publicaciones/abc')
        .set('Authorization', authAs(ada))
        .send({ titulo: 'ID inválido' })
        .expect(400);

      await request(app.getHttpServer())
        .patch(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(ada))
        .send({ titulo: 'Nuevo', creadoEn: '2000-01-01' })
        .expect(400);

      expect(db.posts[0].titulo).toBe('Título');
    });

    it('18. permite la actualización parcial sin perder información', async () => {
      const post = seedPost('1', 'Solo título');

      const soloContenido = await request(app.getHttpServer())
        .patch(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(ada))
        .send({ contenido: 'Contenido actualizado' })
        .expect(200);

      expect(soloContenido.body.titulo).toBe('Solo título');
      expect(soloContenido.body.contenido).toBe('Contenido actualizado');

      const soloTitulo = await request(app.getHttpServer())
        .patch(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(ada))
        .send({ titulo: 'Título actualizado' })
        .expect(200);

      expect(soloTitulo.body.titulo).toBe('Título actualizado');
      expect(soloTitulo.body.contenido).toBe('Contenido actualizado');
      expect(soloTitulo.body.autor).toEqual({ id: '1', nombre: 'Ada Lovelace' });
      expect(db.posts[0].autorId).toBe('1');
    });
  });

  describe('HU-06: eliminar publicaciones', () => {
    it('19. permite al autor eliminar su publicación (204 sin cuerpo)', async () => {
      const post = seedPost('1');

      const response = await request(app.getHttpServer())
        .delete(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(ada))
        .expect(204);

      expect(response.text).toBe('');
      expect(db.posts).toHaveLength(0);
    });

    it('20. permite a un MODERADOR eliminar una publicación ajena (204)', async () => {
      const post = seedPost('1');

      await request(app.getHttpServer())
        .delete(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(moderador))
        .expect(204);

      expect(db.posts).toHaveLength(0);
    });

    it('21. permite a un ADMIN eliminar una publicación ajena (204)', async () => {
      const post = seedPost('1');

      await request(app.getHttpServer())
        .delete(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(admin))
        .expect(204);

      expect(db.posts).toHaveLength(0);
    });

    it('22. impide a un USUARIO eliminar una publicación ajena (403)', async () => {
      const post = seedPost('1');

      await request(app.getHttpServer())
        .delete(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(grace))
        .expect(403);

      expect(db.posts).toHaveLength(1);
    });

    it('23. rechaza la eliminación sin autenticación (401)', async () => {
      const post = seedPost('1');

      await request(app.getHttpServer())
        .delete(`/publicaciones/${post.id}`)
        .expect(401);

      expect(db.posts).toHaveLength(1);
    });

    it('24. rechaza eliminar una publicación inexistente (404)', async () => {
      await request(app.getHttpServer())
        .delete('/publicaciones/999')
        .set('Authorization', authAs(ada))
        .expect(404);
    });

    it('24. rechaza un identificador inválido con 400', async () => {
      await request(app.getHttpServer())
        .delete('/publicaciones/abc')
        .set('Authorization', authAs(ada))
        .expect(400);
    });

    it('25. elimina los comentarios asociados', async () => {
      const post = seedPost('1');
      seedComment(post.id);
      seedComment(post.id);

      await request(app.getHttpServer())
        .delete(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(ada))
        .expect(204);

      expect(
        db.comments.filter((comment) => comment.publicacionId === post.id),
      ).toHaveLength(0);
    });

    it('26. elimina las reacciones asociadas', async () => {
      const post = seedPost('1');
      seedReaction(post.id);

      await request(app.getHttpServer())
        .delete(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(ada))
        .expect(204);

      expect(
        db.reactions.filter(
          (reaction) => reaction.publicacionId === post.id,
        ),
      ).toHaveLength(0);
    });

    it('27. conserva la integridad referencial tras la eliminación', async () => {
      const post = seedPost('1');
      const otra = seedPost('2');
      seedComment(post.id);
      seedReaction(post.id);
      seedComment(otra.id);
      seedReaction(otra.id);

      await request(app.getHttpServer())
        .delete(`/publicaciones/${post.id}`)
        .set('Authorization', authAs(moderador))
        .expect(204);

      expect(db.posts.map((candidate) => candidate.id)).toEqual([otra.id]);
      expect(
        db.comments.filter((comment) => comment.publicacionId === post.id),
      ).toHaveLength(0);
      expect(
        db.reactions.filter(
          (reaction) => reaction.publicacionId === post.id,
        ),
      ).toHaveLength(0);
      expect(
        db.comments.every((comment) =>
          db.posts.some((candidate) => candidate.id === comment.publicacionId),
        ),
      ).toBe(true);
      expect(
        db.reactions.every((reaction) =>
          db.posts.some((candidate) => candidate.id === reaction.publicacionId),
        ),
      ).toBe(true);
      expect(db.transactions).toBe(1);
    });
  });
});
