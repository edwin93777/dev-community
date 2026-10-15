import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RoleName } from './entities/role.entity.js';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rolesRepository.upsert(
      [
        {
          nombre: RoleName.ADMIN,
          descripcion: 'Administración completa de la comunidad.',
        },
        {
          nombre: RoleName.MODERADOR,
          descripcion: 'Moderación del contenido de la comunidad.',
        },
        {
          nombre: RoleName.USUARIO,
          descripcion: 'Participación estándar en la comunidad.',
        },
      ],
      ['nombre'],
    );
  }
}
