import { ApiProperty } from '@nestjs/swagger';

export class ReactionCountResponseDto {
  @ApiProperty({
    description: 'Identificador de la publicación',
    example: '1',
  })
  publicacionId!: string;

  @ApiProperty({
    description: 'Cantidad total de likes',
    example: 0,
    minimum: 0,
  })
  totalLikes!: number;
}
