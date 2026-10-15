import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Post } from '../../posts/entities/post.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity({ name: 'comentarios' })
@Index('idx_comentarios_publicacion_id', ['publicacionId'])
@Index('idx_comentarios_autor_id', ['autorId'])
export class Comment {
  @ApiProperty({ description: 'Identificador del comentario', example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @ApiProperty({
    name: 'publicacion_id',
    description: 'Clave foránea a publicaciones.id',
  })
  @Column({ name: 'publicacion_id', type: 'bigint', unsigned: true })
  publicacionId!: string;

  @ApiProperty({ name: 'autor_id', description: 'Clave foránea a usuarios.id' })
  @Column({ name: 'autor_id', type: 'bigint', unsigned: true })
  autorId!: string;

  @ApiProperty({ type: String, example: 'Un comentario' })
  @Column({ type: 'text' })
  contenido!: string;

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

  @ManyToOne(() => Post, (post) => post.comentarios, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'publicacion_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_comentarios_publicacion',
  })
  publicacion!: Relation<Post>;

  @ManyToOne(() => User, (user) => user.comentarios, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'autor_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_comentarios_autor',
  })
  autor!: Relation<User>;
}
