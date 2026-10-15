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
import { User } from '../../users/entities/user.entity.js';

@Entity({ name: 'publicaciones' })
@Index('idx_publicaciones_autor_id', ['autorId'])
export class Post {
  @ApiProperty({ description: 'Identificador de la publicación', example: '1' })
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @ApiProperty({ name: 'autor_id', description: 'Clave foránea a usuarios.id' })
  @Column({ name: 'autor_id', type: 'bigint', unsigned: true })
  autorId!: string;

  @ApiProperty({ maxLength: 180, example: 'Mi primera publicación' })
  @Column({ type: 'varchar', length: 180 })
  titulo!: string;

  @ApiProperty({ type: String, example: 'Contenido de la publicación' })
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

  @ManyToOne(() => User, (user) => user.publicaciones, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'autor_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_publicaciones_autor',
  })
  autor!: Relation<User>;

  @OneToMany(() => Comment, (comment) => comment.publicacion)
  comentarios!: Relation<Comment[]>;

  @OneToMany(() => Reaction, (reaction) => reaction.publicacion)
  reacciones!: Relation<Reaction[]>;
}
