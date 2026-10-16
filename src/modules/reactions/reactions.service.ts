import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Post } from '../posts/entities/post.entity.js';
import { Reaction } from './entities/reaction.entity.js';
import { ReactionCountResponseDto } from './dto/reaction-count-response.dto.js';

const PUBLICACION_ID_REGEX = /^[1-9][0-9]*$/;

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(Reaction)
    private readonly reactionsRepository: Repository<Reaction>,
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
  ) {}

  async addLike(publicacionId: string, usuarioId: string): Promise<void> {
    try {
      await this.findPostOrFail(publicacionId);

      const existingReaction = await this.reactionsRepository.findOneBy({
        publicacionId,
        usuarioId,
      });
      if (existingReaction) {
        throw new ConflictException(
          'Ya has indicado que te gusta esta publicación.',
        );
      }

      await this.reactionsRepository.save(
        this.reactionsRepository.create({ publicacionId, usuarioId }),
      );
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        try {
          const existingReaction = await this.reactionsRepository.findOneBy({
            publicacionId,
            usuarioId,
          });
          if (existingReaction) {
            throw new ConflictException(
              'Ya has indicado que te gusta esta publicación.',
            );
          }
        } catch (lookupError) {
          if (lookupError instanceof HttpException) {
            throw lookupError;
          }
          throw new InternalServerErrorException(
            'No se pudo verificar si la reacción ya existe.',
            { cause: lookupError },
          );
        }
      }

      this.handlePersistenceError(
        error,
        'No se pudo agregar la reacción a la publicación.',
      );
    }
  }

  async removeLike(publicacionId: string, usuarioId: string): Promise<void> {
    try {
      await this.findPostOrFail(publicacionId);

      const result = await this.reactionsRepository.delete({
        publicacionId,
        usuarioId,
      });
      if (!result.affected) {
        throw new NotFoundException(
          'No has indicado que te gusta esta publicación.',
        );
      }
    } catch (error) {
      this.handlePersistenceError(
        error,
        'No se pudo quitar la reacción de la publicación.',
      );
    }
  }

  async countLikes(publicacionId: string): Promise<ReactionCountResponseDto> {
    try {
      await this.findPostOrFail(publicacionId);
      const totalLikes = await this.reactionsRepository.count({
        where: { publicacionId },
      });

      return { publicacionId, totalLikes };
    } catch (error) {
      this.handlePersistenceError(
        error,
        'No se pudo consultar la cantidad de reacciones.',
      );
    }
  }

  private async findPostOrFail(id: string): Promise<void> {
    if (!PUBLICACION_ID_REGEX.test(id)) {
      throw new BadRequestException(
        'El identificador de la publicación debe ser un número positivo.',
      );
    }

    const post = await this.postsRepository.findOneBy({ id });
    if (!post) {
      throw new NotFoundException('Publicación no encontrada.');
    }
  }

  private handlePersistenceError(error: unknown, message: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    const errorCode = this.getDatabaseErrorCode(error);
    if (
      errorCode === 'ER_NO_REFERENCED_ROW_2' ||
      errorCode === 'ER_NO_REFERENCED_ROW' ||
      errorCode === '23503'
    ) {
      throw new BadRequestException('La publicación o el usuario no existen.');
    }

    throw new InternalServerErrorException(message, { cause: error });
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    const errorCode = this.getDatabaseErrorCode(error);
    return errorCode === 'ER_DUP_ENTRY' || errorCode === '23505';
  }

  private getDatabaseErrorCode(error: unknown): string | number | undefined {
    if (!(error instanceof QueryFailedError)) {
      return undefined;
    }

    const driverError: unknown = error.driverError;
    if (typeof driverError !== 'object' || driverError === null) {
      return undefined;
    }
    if (
      'code' in driverError &&
      (typeof driverError.code === 'string' ||
        typeof driverError.code === 'number')
    ) {
      return driverError.code;
    }
    if (
      'errno' in driverError &&
      (typeof driverError.errno === 'string' ||
        typeof driverError.errno === 'number')
    ) {
      return driverError.errno;
    }

    return undefined;
  }
}
