import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { UserWithAccess } from '../users.repository';

/** نمایش امن کاربر — بدون passwordHash */
export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiProperty({ required: false }) phone: string | null;
  @ApiProperty() status: string;
  @ApiProperty({ required: false }) extension: string | null;
  @ApiProperty({ type: [String] }) roles: string[];
  @ApiProperty({ type: [String] }) permissions: string[];
  @ApiProperty() createdAt: Date;

  static from(user: User, roles: string[] = [], permissions: string[] = []): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      extension: user.extension,
      roles,
      permissions,
      createdAt: user.createdAt,
    };
  }

  static fromWithAccess(user: UserWithAccess): UserResponseDto {
    const roles = user.roles.map((ur) => ur.role.key);
    const permissions = [
      ...new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key))),
    ];
    return UserResponseDto.from(user, roles, permissions);
  }
}
