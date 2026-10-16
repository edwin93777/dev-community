import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Post } from '../../posts/entities/post.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity({ name: 'reacciones' })
@Unique('uq_reacciones_usuario_publicacion', ['usuarioId', 'publicacionId'])
@Index('idx_reacciones_publicacion_id', ['publicacionId'])
@Index('idx_reacciones_usuario_id', ['usuarioId'])
export class Reaction {
  @ApiProperty({ description: 'Identificador de la reacción', example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @ApiProperty({
    name: 'usuario_id',
    description: 'Clave foránea a usuarios.id',
  })
  @Column({ name: 'usuario_id', type: 'bigint', unsigned: true })
  usuarioId!: string;

  @ApiProperty({
    name: 'publicacion_id',
    description: 'Clave foránea a publicaciones.id',
  })
  @Column({ name: 'publicacion_id', type: 'bigint', unsigned: true })
  publicacionId!: string;

  @ManyToOne(() => User, (user) => user.reacciones, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'usuario_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_reacciones_usuario',
  })
  usuario!: Relation<User>;

  @ManyToOne(() => Post, (post) => post.reacciones, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'publicacion_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_reacciones_publicacion',
  })
  publicacion!: Relation<Post>;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({
    name: 'creado_en',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  creadoEn!: Date;
}
