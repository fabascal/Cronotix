import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignDocumentsDto {
  @ApiProperty({
    description: 'Array de UUIDs de documentos a asignar al agente',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  documentIds: string[];
}
