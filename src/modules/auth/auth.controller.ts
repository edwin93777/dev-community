import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar usuario',
    description:
      'Crea una cuenta con rol USUARIO. El correo se normaliza a minúsculas ' +
      'y la contraseña se almacena como hash bcrypt. No es posible asignar ' +
      'roles ADMIN o MODERADOR desde este endpoint.',
  })
  @ApiCreatedResponse({ description: 'Usuario registrado correctamente.' })
  @ApiBadRequestResponse({ description: 'Datos de registro inválidos.' })
  @ApiConflictResponse({ description: 'El correo ya está registrado.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica al usuario y devuelve un JWT de acceso.',
  })
  @ApiOkResponse({
    description: 'Autenticación correcta.',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Datos de login inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales incorrectas.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener identidad autenticada',
    description:
      'Devuelve la identidad publicada por JwtStrategy a partir del token ' +
      'enviado en el encabezado Authorization: Bearer <token>.',
  })
  @ApiOkResponse({ description: 'Identidad del usuario autenticado.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido o expirado.' })
  perfil(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
