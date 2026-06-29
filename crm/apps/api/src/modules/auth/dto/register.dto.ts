import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@shofazh.com' })
  @IsEmail({}, { message: 'ایمیل نامعتبر است' })
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ نویسه باشد' })
  password: string;

  @ApiProperty({ example: 'علی رضایی' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiPropertyOptional({ example: '09121234567' })
  @IsOptional()
  @IsString()
  phone?: string;
}
