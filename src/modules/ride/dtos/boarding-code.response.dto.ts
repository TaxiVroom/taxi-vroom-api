import { ApiProperty } from '@nestjs/swagger';

export class BoardingCodeResponseDto {
  @ApiProperty({ example: '4817' })
  code: string;
}
