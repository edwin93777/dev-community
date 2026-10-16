import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

/**
 * Parámetro de ruta `:id` de una publicación (HU-04 / HU-05 / HU-06).
 *
 * El identificador se almacena como `bigint` en MySQL, por lo que se admite
 * únicamente una secuencia de dígitos sin signo ni ceros a la izquierda.
 * El `ValidationPipe` global valida los parámetros de ruta y devuelve
 * `400 Bad Request` cuando el formato no es válido, evitando que un valor no
 * numérico llegue a una consulta SQL.
 */
export class PostIdParamDto {
  @ApiProperty({
    description: 'Identificador numérico de la publicación',
    example: '1',
  })
  @Matches(/^[1-9][0-9]*$/, {
    message: 'El identificador de la publicación debe ser un número positivo.',
  })
  id!: string;
}
