import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: config.getOrThrow<'mysql'>('database.type'),
        host: config.getOrThrow<string>('database.host'),
        port: config.getOrThrow<number>('database.port'),
        username: config.getOrThrow<string>('database.username'),
        password: config.getOrThrow<string>('database.password'),
        database: config.getOrThrow<string>('database.database'),
        charset: config.getOrThrow<string>('database.charset'),
        logging: config.getOrThrow<boolean>('database.logging'),
        synchronize: config.getOrThrow<boolean>('database.synchronize'),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
