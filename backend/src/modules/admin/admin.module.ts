import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../database/entities/role.entity';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminService } from './admin.service';
import { RolesController } from './roles.controller';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role, User, Tenant]), AuthModule],
  controllers: [RolesController, UsersController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
