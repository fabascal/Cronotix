import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from '../../database/entities/skill.entity';
import { AuthModule } from '../auth/auth.module';
import { SkillsCrudService } from './skills-crud.service';
import { SkillsDashboardController } from './skills-dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Skill]),
    AuthModule,
  ],
  providers: [SkillsCrudService],
  controllers: [SkillsDashboardController],
  exports: [SkillsCrudService],
})
export class SkillsModule {}
