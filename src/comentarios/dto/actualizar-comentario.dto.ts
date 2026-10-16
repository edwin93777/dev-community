import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class ActualizarComentarioDto {
  @ApiProperty({
    description: 'Nuevo contenido del comentario',
    example: 'Actualizo mi comentario.',
    maxLength: 1000,
  })
  @IsString({ message: 'El contenido debe ser un texto.' })
  @IsNotEmpty({ message: 'El contenido no puede estar vacío.' })
  @Matches(/\S/, { message: 'El contenido no puede estar vacío.' })
  @MaxLength(1000, {
    message: 'El contenido no puede superar los 1000 caracteres.',
  })
  contenido!: string;
}