import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('کاربران')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'مشاهده‌ی یک کاربر (نیازمند مجوز مدیریت کاربران)' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.getProfile(id);
    return UserResponseDto.fromWithAccess(user);
  }
}
