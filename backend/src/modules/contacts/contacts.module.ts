import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactList } from '../../database/entities/contact-list.entity';
import { ContactEntry } from '../../database/entities/contact-entry.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { ApiKey } from '../../database/entities/api-key.entity';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactList, ContactEntry, Tenant, ApiKey]),
    AuthModule,
  ],
  providers: [ContactsService, JwtAuthGuard, ApiKeyGuard, JwtOrApiKeyGuard],
  controllers: [ContactsController],
  exports: [ContactsService],
})
export class ContactsModule {}
