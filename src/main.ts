import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { Comment } from './modules/comments/entities/comment.entity.js';
import { Post } from './modules/posts/entities/post.entity.js';
import { Reaction } from './modules/reactions/entities/reaction.entity.js';
import { Role } from './modules/roles/entities/role.entity.js';
import { User } from './modules/users/entities/user.entity.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const apiPrefix = config.getOrThrow<string>('app.apiPrefix');
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.getOrThrow<string>('swagger.title'))
    .setDescription(config.getOrThrow<string>('swagger.description'))
    .setVersion(config.getOrThrow<string>('swagger.version'))
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [Role, User, Post, Comment, Reaction],
  });
  SwaggerModule.setup(
    `${apiPrefix}/${config.getOrThrow<string>('swagger.path')}`,
    app,
    document,
  );

  await app.listen(config.getOrThrow<number>('app.port'));
}
void bootstrap();
