import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../../modules/users/dto/user-response.dto';

export class AuthTokensDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ description: 'عمر توکن دسترسی به ثانیه' }) expiresIn: number;
  @ApiProperty({ type: UserResponseDto }) user: UserResponseDto;
}
