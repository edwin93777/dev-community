import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration.js';
import { validateEnvironment } from './config/validate-env.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { PostsModule } from './modules/posts/posts.module.js';
import { CommentsModule } from './modules/comments/comments.module.js';
import { ReactionsModule } from './modules/reactions/reactions.module.js';
import { ComentariosModule } from './comentarios/comentarios.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PostsModule,
    CommentsModule,
    ComentariosModule,
    ReactionsModule,
  ],
})
export class AppModule {}
