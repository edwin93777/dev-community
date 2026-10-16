import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import type { RoleName } from '../../roles/entities/role.entity.js';
import { User } from '../../users/entities/user.entity.js';

export interface JwtPayload {
  sub: string;
  correo: string;
  rol: RoleName;
}

/**
 * Estrategia JWT de Passport. Extrae el token del encabezado
 * `Authorization: Bearer <token>`, valida firma y expiración, y publica la
 * identidad autenticada en `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) config: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: { rol: true },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    return {
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol.nombre,
    };
  }
}
