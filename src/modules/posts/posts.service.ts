import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { Comment } from '../comments/entities/comment.entity.js';
import { Reaction } from '../reactions/entities/reaction.entity.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { PostResponseDto } from './dto/post-response.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { Post } from './entities/post.entity.js';
import { PostAuthorizationPolicy } from './policies/post-authorization.policy.js';

const PUBLICACION_ID_REGEX = /^[1-9][0-9]*$/;

/**
 * Reglas de negocio de publicaciones (HU-04, HU-05 y HU-06).
 *
 * La autenticación la resuelve `JwtAuthGuard` + `JwtStrategy` y el control de
 * roles a nivel de ruta `RolesGuard`; este servicio aplica la autorización por
 * propiedad: quien edita debe ser el autor o un ADMIN, y quien elimina debe
 * ser el autor, un MODERADOR o un ADMIN.
 */
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    private readonly authorizationPolicy: PostAuthorizationPolicy,
  ) {}

  /**
   * Crea una publicación asociada al usuario autenticado.
   * El autor proviene exclusivamente del JWT: nunca se acepta del cliente.
   */
  async create(
    dto: CreatePostDto,
    user: AuthenticatedUser,
  ): Promise<PostResponseDto> {
    const post = this.postsRepository.create({
      titulo: dto.titulo,
      contenido: dto.contenido,
      autorId: user.id,
    });

    const saved = await this.postsRepository.save(post);

    return this.toResponse(await this.findEntityOrFail(saved.id));
  }

  /** Lista las publicaciones de la más reciente a la más antigua. */
  async findAll(): Promise<PostResponseDto[]> {
    const posts = await this.postsRepository.find({
      relations: { autor: true },
      order: { creadoEn: 'DESC' },
    });

    return posts.map((post) => this.toResponse(post));
  }

  /** Devuelve una publicación por su identificador público. */
  async findOne(id: string): Promise<PostResponseDto> {
    return this.toResponse(await this.findEntityOrFail(id));
  }

  /**
   * Actualiza título y/o contenido de una publicación.
   * Solo el autor o un ADMIN pueden editar; los campos no enviados se
   * conservan y el autor y las fechas nunca se modifican desde el DTO.
   */
  async update(
    id: string,
    dto: UpdatePostDto,
    user: AuthenticatedUser,
  ): Promise<PostResponseDto> {
    const post = await this.findEntityOrFail(id);

    if (!this.authorizationPolicy.canEdit(user, post)) {
      throw new ForbiddenException(
        'No tienes permisos para editar esta publicación.',
      );
    }

    if (dto.titulo !== undefined) {
      post.titulo = dto.titulo;
    }
    if (dto.contenido !== undefined) {
      post.contenido = dto.contenido;
    }

    const saved = await this.postsRepository.save(post);

    return this.toResponse(saved);
  }

  /**
   * Elimina una publicación junto con sus comentarios y reacciones.
   * Solo el autor, un MODERADOR o un ADMIN pueden eliminarla.
   *
   * Las FK `fk_comentarios_publicacion` y `fk_reacciones_publicacion` ya
   * declaran `ON DELETE CASCADE`; además, los hijos se eliminan de forma
   * explícita dentro de una transacción para no dejar registros huérfanos
   * aunque el esquema cambie.
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const post = await this.findEntityOrFail(id);

    if (!this.authorizationPolicy.canDelete(user, post)) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar esta publicación.',
      );
    }

    try {
      await this.postsRepository.manager.transaction(async (manager) => {
        await manager.delete(Reaction, { publicacionId: post.id });
        await manager.delete(Comment, { publicacionId: post.id });

        const result = await manager.delete(Post, { id: post.id });
        if (!result.affected) {
          throw new NotFoundException('Publicación no encontrada.');
        }
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'No se pudo eliminar la publicación.',
      );
    }
  }

  private async findEntityOrFail(id: string): Promise<Post> {
    if (!PUBLICACION_ID_REGEX.test(String(id))) {
      throw new BadRequestException(
        'El identificador de la publicación debe ser un número positivo.',
      );
    }

    const post = await this.postsRepository.findOne({
      where: { id },
      relations: { autor: true },
    });

    if (!post) {
      throw new NotFoundException('Publicación no encontrada.');
    }

    return post;
  }

  private toResponse(post: Post): PostResponseDto {
    return {
      id: post.id,
      titulo: post.titulo,
      contenido: post.contenido,
      creadoEn: post.creadoEn,
      autor: {
        id: post.autor?.id ?? post.autorId,
        nombre: post.autor?.nombre ?? '',
      },
    };
  }
}
