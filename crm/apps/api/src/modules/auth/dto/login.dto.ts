import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@shofazh.com' })
  @IsEmail({}, { message: 'ایمیل نامعتبر است' })
  email: string;

  @ApiProperty({ example: 'Admin@12345', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ نویسه باشد' })
  password: string;
}
