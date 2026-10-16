import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { Post } from '../modules/posts/entities/post.entity.js';
import { RoleName } from '../modules/roles/entities/role.entity.js';
import { ActualizarComentarioDto } from './dto/actualizar-comentario.dto.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { Comentario } from './entities/comentario.entity.js';

const ROLES_QUE_PUEDEN_ELIMINAR_AJENOS: RoleName[] = [RoleName.MODERADOR];

interface AutorComentario {
  id: string;
  nombre: string;
}

export interface ComentarioRespuesta {
  id: string;
  contenido: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  publicacionId: string;
  autor: AutorComentario;
}

@Injectable()
export class ComentariosService {
  constructor(
    @InjectRepository(Comentario)
    private readonly comentariosRepository: Repository<Comentario>,
    @InjectRepository(Post)
    private readonly publicacionesRepository: Repository<Post>,
  ) {}

  async crear(
    publicacionId: string,
    dto: CrearComentarioDto,
    usuario: AuthenticatedUser,
  ): Promise<ComentarioRespuesta> {
    const publicacion = await this.publicacionesRepository.findOne({
      where: { id: publicacionId },
    });

    if (!publicacion) {
      throw new NotFoundException('Publicación no encontrada.');
    }

    const comentario = this.comentariosRepository.create({
      contenido: dto.contenido,
      autorId: usuario.id,
      publicacionId: publicacion.id,
    });
    const guardado = await this.comentariosRepository.save(comentario);

    return this.aRespuesta(guardado, {
      id: usuario.id,
      nombre: usuario.nombre,
    });
  }

  async listarPorPublicacion(
    publicacionId: string,
  ): Promise<ComentarioRespuesta[]> {
    const publicacion = await this.publicacionesRepository.findOne({
      where: { id: publicacionId },
    });

    if (!publicacion) {
      throw new NotFoundException('Publicación no encontrada.');
    }

    const comentarios = await this.comentariosRepository.find({
      where: { publicacionId: publicacion.id },
      relations: { autor: true },
      order: { creadoEn: 'ASC' },
    });

    return comentarios.map((comentario) => this.aRespuesta(comentario));
  }

  async actualizar(
    comentarioId: string,
    dto: ActualizarComentarioDto,
    usuario: AuthenticatedUser,
  ): Promise<ComentarioRespuesta> {
    const comentario = await this.buscarComentario(comentarioId);

    if (comentario.autorId !== usuario.id) {
      throw new ForbiddenException(
        'Solo el autor puede editar este comentario.',
      );
    }

    comentario.contenido = dto.contenido;
    const guardado = await this.comentariosRepository.save(comentario);

    return this.aRespuesta(guardado);
  }

  async eliminar(comentarioId: string, usuario: AuthenticatedUser): Promise<void> {
    const comentario = await this.buscarComentario(comentarioId);
    const esAutor = comentario.autorId === usuario.id;
    const puedeEliminarAjeno = ROLES_QUE_PUEDEN_ELIMINAR_AJENOS.includes(
      usuario.rol,
    );

    if (!esAutor && !puedeEliminarAjeno) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este comentario.',
      );
    }

    await this.comentariosRepository.delete({ id: comentario.id });
  }

  private async buscarComentario(comentarioId: string): Promise<Comentario> {
    const comentario = await this.comentariosRepository.findOne({
      where: { id: comentarioId },
      relations: { autor: true },
    });

    if (!comentario) {
      throw new NotFoundException('Comentario no encontrado.');
    }

    return comentario;
  }

  private aRespuesta(
    comentario: Comentario,
    autor?: AutorComentario,
  ): ComentarioRespuesta {
    const autorComentario = autor ?? comentario.autor;

    return {
      id: comentario.id,
      contenido: comentario.contenido,
      fechaCreacion: comentario.creadoEn,
      fechaActualizacion: comentario.actualizadoEn,
      publicacionId: comentario.publicacionId,
      autor: {
        id: autorComentario?.id ?? comentario.autorId,
        nombre: autorComentario?.nombre ?? '',
      },
    };
  }
}