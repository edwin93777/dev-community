import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO de creación de publicaciones (HU-04, `CreatePublicacionDto` del caso
 * práctico). Mantengo la convención de nombres en inglés usada en el
 * repositorio.
 *
 * Solo declara `titulo` y `contenido`: la autoría y la fecha de creación se
 * resuelven en el servidor. El `ValidationPipe` global
 * (`whitelist` + `forbidNonWhitelisted`) rechaza cualquier propiedad extra
 * enviada por el cliente (por ejemplo `autorId`).
 */
export class CreatePostDto {
  @ApiProperty({
    description:
      'Título de la publicación; obligatorio, sin espacios en blanco únicos',
    maxLength: 180,
    example: '¿Cómo manejar errores en NestJS?',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El título debe ser una cadena de texto.' })
  @MinLength(1, { message: 'El título es obligatorio.' })
  @MaxLength(180, { message: 'El título no puede superar los 180 caracteres.' })
  titulo!: string;

  @ApiProperty({
    description:
      'Contenido de la publicación; obligatorio, sin espacios en blanco únicos',
    example: 'Estoy evaluando diferentes enfoques para centralizar errores.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El contenido debe ser una cadena de texto.' })
  @MinLength(1, { message: 'El contenido es obligatorio.' })
  contenido!: string;
}
