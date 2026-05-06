import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSkillsDto {
  @ApiProperty({ type: [String], description: 'IDs de los skills a asignar al agente' })
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds: string[];
}
