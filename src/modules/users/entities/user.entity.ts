import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Comment } from '../../comments/entities/comment.entity.js';
import { Reaction } from '../../reactions/entities/reaction.entity.js';
import { Role } from '../../roles/entities/role.entity.js';
import { Post } from '../../posts/entities/post.entity.js';

@Entity({ name: 'usuarios' })
@Index('uq_usuarios_correo', ['correo'], { unique: true })
@Index('idx_usuarios_rol_id', ['rolId'])
export class User {
  @ApiProperty({ description: 'Identificador único del usuario', example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @ApiProperty({ maxLength: 100, example: 'Ada Lovelace' })
  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @ApiProperty({ maxLength: 254, example: 'ada@example.com' })
  @Column({ type: 'varchar', length: 254 })
  correo!: string;

  @ApiProperty({
    description: 'Hash bcrypt; nunca devolver en respuestas de la API',
    maxLength: 255,
    writeOnly: true,
  })
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @ApiProperty({ name: 'rol_id', description: 'Clave foránea a roles.id' })
  @Column({ name: 'rol_id', type: 'int', unsigned: true })
  rolId!: number;

  @ApiProperty({ default: true })
  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({
    name: 'creado_en',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  creadoEn!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn({
    name: 'actualizado_en',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
  })
  actualizadoEn!: Date;

  @ManyToOne(() => Role, (role) => role.usuarios, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'rol_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_usuarios_rol',
  })
  rol!: Relation<Role>;

  @OneToMany(() => Post, (post) => post.autor)
  publicaciones!: Relation<Post[]>;

  @OneToMany(() => Comment, (comment) => comment.autor)
  comentarios!: Relation<Comment[]>;

  @OneToMany(() => Reaction, (reaction) => reaction.usuario)
  reacciones!: Relation<Reaction[]>;
}
