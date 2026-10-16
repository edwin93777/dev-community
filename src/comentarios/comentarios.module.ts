import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Post } from '../modules/posts/entities/post.entity.js';
import { Comentario } from './entities/comentario.entity.js';
import { ComentariosController } from './comentarios.controller.js';
import { ComentariosService } from './comentarios.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Comentario, Post])],
  controllers: [ComentariosController],
  providers: [ComentariosService, JwtAuthGuard, RolesGuard],
  exports: [ComentariosService],
})
export class ComentariosModule {}