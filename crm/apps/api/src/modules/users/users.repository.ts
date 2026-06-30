import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** نوع کاربر همراه نقش‌ها و مجوزها (برای ساخت توکن) */
export type UserWithAccess = Prisma.UserGetPayload<{
  include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } };
}>;

const ACCESS_INCLUDE = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} satisfies Prisma.UserInclude;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** یافتن اپراتور بر اساس داخلی تلفن (Issabel) — اولین فعال */
  findByExtension(extension: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { extension, status: 'ACTIVE' } });
  }

  findByEmailWithAccess(email: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findUnique({ where: { email }, include: ACCESS_INCLUDE });
  }

  findByIdWithAccess(id: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findUnique({ where: { id }, include: ACCESS_INCLUDE });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  updateLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  /** اتصال نقش به کاربر (idempotent) */
  async assignRole(userId: string, roleKey: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { key: roleKey } });
    if (!role) return;
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  }
}
