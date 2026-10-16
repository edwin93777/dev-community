import { ApiProperty } from '@nestjs/swagger';

/**
 * Datos públicos del autor expuestos por la API de publicaciones.
 * Deliberadamente excluye `passwordHash`, `correo`, `rol` y `activo`:
 * la información sensible del usuario nunca sale en las respuestas.
 */
export class PostAuthorDto {
  @ApiProperty({ description: 'Identificador del autor', example: '1' })
  id!: string;

  @ApiProperty({
    description: 'Nombre público del autor',
    example: 'Ada Lovelace',
  })
  nombre!: string;
}

/**
 * Representación pública de una publicación devuelta por la API.
 * Coincide con la entidad `Post`, sin exponer claves foráneas ni datos
 * sensibles del usuario.
 */
export class PostResponseDto {
  @ApiProperty({ description: 'Identificador de la publicación', example: '1' })
  id!: string;

  @ApiProperty({ maxLength: 180, example: '¿Cómo manejar errores en NestJS?' })
  titulo!: string;

  @ApiProperty({
    type: String,
    example: 'Estoy evaluando diferentes enfoques para centralizar errores.',
  })
  contenido!: string;

  @ApiProperty({
    description: 'Fecha de creación registrada por la entidad',
    type: String,
    format: 'date-time',
  })
  creadoEn!: Date;

  @ApiProperty({ description: 'Autor de la publicación', type: PostAuthorDto })
  autor!: PostAuthorDto;
}
