import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Correo electrónico registrado; se normaliza a minúsculas',
    maxLength: 254,
    example: 'ada@example.com',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  @MaxLength(254, { message: 'El correo no puede superar los 254 caracteres.' })
  correo!: string;

  @ApiProperty({
    description: 'Contraseña en texto plano',
    minLength: 8,
    maxLength: 72,
    example: 'ContraseñaSegura123',
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede superar los 72 caracteres.' })
  password!: string;
}
