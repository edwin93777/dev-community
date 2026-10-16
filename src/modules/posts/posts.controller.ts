import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { RoleName } from '../roles/entities/role.entity.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { PostIdParamDto } from './dto/post-id.param.dto.js';
import { PostResponseDto } from './dto/post-response.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { PostsService } from './posts.service.js';

/**
 * Endpoints de publicaciones (HU-04, HU-05 y HU-06).
 *
 * - Escritura (`POST`, `PATCH`, `DELETE`): requiere JWT. `RolesGuard`
 *   declara el conjunto de roles que pueden intentar la operación y la
 *   autorización por propiedad (autor / MODERADOR / ADMIN) se resuelve en
 *   `PostsService`.
 * - Lectura (`GET`): accesible sin token según la política acordada en el
 *   equipo; no expone datos sensibles del autor.
 */
@ApiTags('publicaciones')
@Controller('publicaciones')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USUARIO, RoleName.MODERADOR, RoleName.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear publicación',
    description:
      'Crea una publicación con el usuario autenticado como autor. El autor ' +
      'se toma del JWT y nunca del cuerpo de la petición. Requiere JWT y ' +
      'rol USUARIO, MODERADOR o ADMIN.',
  })
  @ApiCreatedResponse({
    description: 'Publicación creada (201 Created).',
    type: PostResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos inválidos: título o contenido ausentes o vacíos.',
  })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
  @ApiForbiddenResponse({ description: 'Rol sin permiso para crear.' })
  create(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PostResponseDto> {
    return this.postsService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar publicaciones',
    description:
      'Devuelve las publicaciones ordenadas de más reciente a más antigua ' +
      'con sus datos públicos de autor. No exige autenticación.',
  })
  @ApiOkResponse({
    description: 'Listado de publicaciones; lista vacía si no hay registros.',
    type: PostResponseDto,
    isArray: true,
  })
  findAll(): Promise<PostResponseDto[]> {
    return this.postsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar publicación por ID',
    description:
      'Devuelve el detalle de una publicación. Devuelve 400 si el ID no es ' +
      'numérico y 404 si no existe. No exige autenticación.',
  })
  @ApiParam({ name: 'id', description: 'Identificador de la publicación', example: '1' })
  @ApiOkResponse({ description: 'Publicación encontrada.', type: PostResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiNotFoundResponse({ description: 'Publicación inexistente.' })
  findOne(@Param() params: PostIdParamDto): Promise<PostResponseDto> {
    return this.postsService.findOne(params.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USUARIO, RoleName.MODERADOR, RoleName.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Editar publicación',
    description:
      'Actualiza el título y/o el contenido de una publicación. Solo puede ' +
      'editarla su autor o un usuario con rol ADMIN; un MODERADOR no puede ' +
      'editar publicaciones ajenas. Requiere JWT.',
  })
  @ApiParam({ name: 'id', description: 'Identificador de la publicación', example: '1' })
  @ApiOkResponse({ description: 'Publicación actualizada.', type: PostResponseDto })
  @ApiBadRequestResponse({ description: 'ID o datos de actualización inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
  @ApiForbiddenResponse({ description: 'El usuario no es el autor ni ADMIN.' })
  @ApiNotFoundResponse({ description: 'Publicación inexistente.' })
  update(
    @Param() params: PostIdParamDto,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PostResponseDto> {
    return this.postsService.update(params.id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USUARIO, RoleName.MODERADOR, RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar publicación',
    description:
      'Elimina una publicación y, en la misma transacción, sus comentarios ' +
      'y reacciones. Puede eliminarla su autor, un MODERADOR o un ADMIN. ' +
      'Responde 204 sin cuerpo. Requiere JWT.',
  })
  @ApiParam({ name: 'id', description: 'Identificador de la publicación', example: '1' })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
  @ApiForbiddenResponse({ description: 'Permisos insuficientes.' })
  @ApiNotFoundResponse({ description: 'Publicación inexistente.' })
  remove(
    @Param() params: PostIdParamDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.postsService.remove(params.id, user);
  }
}
