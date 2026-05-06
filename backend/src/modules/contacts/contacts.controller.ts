import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtOrApiKeyGuard } from '../../common/guards/jwt-or-api-key.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactListDto } from './dto/create-list.dto';
import { AddContactEntryDto } from './dto/add-entry.dto';

@ApiTags('Contact Lists')
@ApiBearerAuth()
@UseGuards(JwtOrApiKeyGuard)
@Controller('v1/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar listas de contacto del tenant' })
  findAll(@CurrentUser() user: JwtUserPayload) {
    return this.contactsService.findAll(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una lista de contacto' })
  create(
    @Body() dto: CreateContactListDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.contactsService.create(user.tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener lista con sus contactos' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.contactsService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar nombre/descripción de la lista' })
  update(
    @Param('id') id: string,
    @Body() dto: CreateContactListDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.contactsService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar lista de contacto' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.contactsService.remove(id, user.tenantId);
  }

  @Post(':id/entries')
  @ApiOperation({ summary: 'Agregar un contacto a la lista' })
  addEntry(
    @Param('id') id: string,
    @Body() dto: AddContactEntryDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.contactsService.addEntry(id, user.tenantId, dto);
  }

  @Delete(':id/entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar contacto de la lista' })
  removeEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.contactsService.removeEntry(id, entryId, user.tenantId);
  }

  @Post(':id/import')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar contactos desde CSV' })
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.contactsService.importCsv(id, user.tenantId, file.buffer);
  }
}
