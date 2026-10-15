import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum RoleName {
  ADMIN = 'ADMIN',
  MODERADOR = 'MODERADOR',
  USUARIO = 'USUARIO',
}

@Entity({ name: 'roles' })
@Index('uq_roles_nombre', ['nombre'], { unique: true })
export class Role {
  @ApiProperty({ description: 'Identificador interno del rol', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @ApiProperty({ enum: RoleName, example: RoleName.USUARIO, maxLength: 30 })
  @Column({ type: 'varchar', length: 30 })
  nombre!: RoleName;

  @ApiProperty({
    description: 'Descripción legible del alcance del rol',
    maxLength: 150,
    nullable: true,
  })
  @Column({ type: 'varchar', length: 150, nullable: true })
  descripcion!: string | null;

  @OneToMany(() => User, (user) => user.rol)
  usuarios!: Relation<User[]>;
}
