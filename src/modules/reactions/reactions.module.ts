import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reaction } from './entities/reaction.entity.js';
import { ReactionsController } from './reactions.controller.js';
import { ReactionsService } from './reactions.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Reaction])],
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
