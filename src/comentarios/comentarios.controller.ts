import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { RoleName } from '../modules/roles/entities/role.entity.js';
import { ActualizarComentarioDto } from './dto/actualizar-comentario.dto.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { ComentariosService } from './comentarios.service.js';

@ApiTags('Comentarios')
@Controller()
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Post('publicaciones/:id/comentarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MODERADOR, RoleName.USUARIO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un comentario en una publicación' })
  @ApiParam({ name: 'id', description: 'Identificador de la publicación' })
  @ApiCreatedResponse({ description: 'Comentario creado correctamente.' })
  @ApiBadRequestResponse({ description: 'El contenido no es válido.' })
  @ApiUnauthorizedResponse({ description: 'Se requiere autenticación.' })
  @ApiForbiddenResponse({ description: 'No tienes permiso para comentar.' })
  @ApiNotFoundResponse({ description: 'Publicación no encontrada.' })
  crear(
    @Param('id') publicacionId: string,
    @Body() dto: CrearComentarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.comentariosService.crear(publicacionId, dto, usuario);
  }

  @Get('publicaciones/:id/comentarios')
  @ApiOperation({ summary: 'Listar comentarios de una publicación' })
  @ApiParam({ name: 'id', description: 'Identificador de la publicación' })
  @ApiOkResponse({ description: 'Lista de comentarios de la publicación.' })
  @ApiNotFoundResponse({ description: 'Publicación no encontrada.' })
  listar(@Param('id') publicacionId: string) {
    return this.comentariosService.listarPorPublicacion(publicacionId);
  }

  @Patch('comentarios/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MODERADOR, RoleName.USUARIO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar un comentario propio' })
  @ApiParam({ name: 'id', description: 'Identificador del comentario' })
  @ApiOkResponse({ description: 'Comentario actualizado correctamente.' })
  @ApiBadRequestResponse({ description: 'El contenido no es válido.' })
  @ApiUnauthorizedResponse({ description: 'Se requiere autenticación.' })
  @ApiForbiddenResponse({ description: 'Solo el autor puede editarlo.' })
  @ApiNotFoundResponse({ description: 'Comentario no encontrado.' })
  actualizar(
    @Param('id') comentarioId: string,
    @Body() dto: ActualizarComentarioDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.comentariosService.actualizar(comentarioId, dto, usuario);
  }

  @Delete('comentarios/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MODERADOR, RoleName.USUARIO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un comentario propio o moderar uno ajeno' })
  @ApiParam({ name: 'id', description: 'Identificador del comentario' })
  @ApiOkResponse({ description: 'Comentario eliminado correctamente.' })
  @ApiUnauthorizedResponse({ description: 'Se requiere autenticación.' })
  @ApiForbiddenResponse({ description: 'No tienes permiso para eliminarlo.' })
  @ApiNotFoundResponse({ description: 'Comentario no encontrado.' })
  async eliminar(
    @Param('id') comentarioId: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    await this.comentariosService.eliminar(comentarioId, usuario);
    return { mensaje: 'Comentario eliminado correctamente.' };
  }
}