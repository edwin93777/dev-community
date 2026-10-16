import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role, RoleName } from '../roles/entities/role.entity.js';
import { User } from '../users/entities/user.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

const BCRYPT_ROUNDS = 10;

export interface RegisteredUserResponse {
  id: string;
  nombre: string;
  correo: string;
  rol: RoleName;
  activo: boolean;
  creadoEn: Date;
}

export interface AuthenticatedResponse {
  access_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisteredUserResponse> {
    const correo = this.normalizeEmail(dto.correo);

    const existing = await this.usersRepository.findOne({ where: { correo } });
    if (existing) {
      throw new ConflictException('El correo ya está registrado.');
    }

    const role = await this.rolesRepository.findOne({
      where: { nombre: RoleName.USUARIO },
    });
    if (!role) {
      throw new InternalServerErrorException(
        'El rol USUARIO no está configurado.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.usersRepository.create({
      nombre: dto.nombre,
      correo,
      passwordHash,
      rolId: role.id,
      activo: true,
    });
    const saved = await this.usersRepository.save(user);

    return {
      id: saved.id,
      nombre: saved.nombre,
      correo: saved.correo,
      rol: role.nombre,
      activo: saved.activo,
      creadoEn: saved.creadoEn,
    };
  }

  async login(dto: LoginDto): Promise<AuthenticatedResponse> {
    const correo = this.normalizeEmail(dto.correo);

    const user = await this.usersRepository.findOne({
      where: { correo },
      relations: { rol: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const payload: JwtPayload = {
      sub: user.id,
      correo: user.correo,
      rol: user.rol.nombre,
    };

    return { access_token: await this.jwtService.signAsync(payload) };
  }

  private normalizeEmail(correo: string): string {
    return correo.trim().toLowerCase();
  }
}
