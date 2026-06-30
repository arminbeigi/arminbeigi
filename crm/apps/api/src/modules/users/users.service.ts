import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository, UserWithAccess } from './users.repository';

export interface FlattenedAccess {
  roles: string[];
  permissions: string[];
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  findByEmailWithAccess(email: string): Promise<UserWithAccess | null> {
    return this.usersRepo.findByEmailWithAccess(email);
  }

  findByIdWithAccess(id: string): Promise<UserWithAccess | null> {
    return this.usersRepo.findByIdWithAccess(id);
  }

  /** یافتن اپراتور بر اساس داخلی تلفن (برای تطبیق تماس) */
  findByExtension(extension: string) {
    return this.usersRepo.findByExtension(extension);
  }

  async getProfile(id: string): Promise<UserWithAccess> {
    const user = await this.usersRepo.findByIdWithAccess(id);
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    return user;
  }

  async createUser(params: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
    roleKeys?: string[];
  }): Promise<User> {
    const existing = await this.usersRepo.findByEmail(params.email);
    if (existing) throw new ConflictException('این ایمیل قبلاً ثبت شده است');

    const user = await this.usersRepo.create({
      email: params.email,
      passwordHash: params.passwordHash,
      fullName: params.fullName,
      phone: params.phone,
    });

    for (const roleKey of params.roleKeys ?? []) {
      await this.usersRepo.assignRole(user.id, roleKey);
    }
    return user;
  }

  updateLastLogin(id: string): Promise<User> {
    return this.usersRepo.updateLastLogin(id);
  }

  /** تخت‌کردن نقش‌ها و مجوزها به آرایه‌ی کلید (برای payload توکن و RBAC) */
  flattenAccess(user: UserWithAccess): FlattenedAccess {
    const roles = user.roles.map((ur) => ur.role.key);
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.key)),
      ),
    ];
    return { roles, permissions };
  }
}
