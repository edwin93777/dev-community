import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PostIdParamDto } from '../posts/dto/post-id.param.dto.js';
import { ReactionCountResponseDto } from './dto/reaction-count-response.dto.js';
import { ReactionsService } from './reactions.service.js';

@ApiTags('reacciones')
@Controller('publicaciones/:id')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post('like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Agregar like a una publicación',
    description:
      'Registra un like para el usuario autenticado. Un mismo usuario solo ' +
      'puede indicar que le gusta una publicación una vez.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador de la publicación',
    example: '1',
  })
  @ApiCreatedResponse({ description: 'Like agregado (201 Created).' })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiForbiddenResponse({ description: 'Acceso denegado.' })
  @ApiNotFoundResponse({ description: 'Publicación inexistente.' })
  @ApiConflictResponse({
    description: 'El usuario ya indicó que le gusta esta publicación.',
  })
  addLike(
    @Param() params: PostIdParamDto,
    @CurrentUser('id') usuarioId: string,
  ): Promise<void> {
    return this.reactionsService.addLike(params.id, usuarioId);
  }

  @Delete('like')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Quitar like de una publicación',
    description:
      'Elimina únicamente el like del usuario autenticado. No es posible ' +
      'quitar la reacción de otro usuario.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador de la publicación',
    example: '1',
  })
  @ApiNoContentResponse({ description: 'Like eliminado (204 No Content).' })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido o expirado.',
  })
  @ApiForbiddenResponse({ description: 'Acceso denegado.' })
  @ApiNotFoundResponse({
    description:
      'Publicación inexistente o el usuario no ha indicado que le gusta.',
  })
  removeLike(
    @Param() params: PostIdParamDto,
    @CurrentUser('id') usuarioId: string,
  ): Promise<void> {
    return this.reactionsService.removeLike(params.id, usuarioId);
  }

  @Get('likes/count')
  @ApiOperation({
    summary: 'Consultar cantidad de likes de una publicación',
    description:
      'Devuelve la cantidad de likes sin cargar las reacciones. No requiere ' +
      'autenticación.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador de la publicación',
    example: '1',
  })
  @ApiOkResponse({
    description: 'Cantidad de likes consultada.',
    type: ReactionCountResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiNotFoundResponse({ description: 'Publicación inexistente.' })
  countLikes(
    @Param() params: PostIdParamDto,
  ): Promise<ReactionCountResponseDto> {
    return this.reactionsService.countLikes(params.id);
  }
}
