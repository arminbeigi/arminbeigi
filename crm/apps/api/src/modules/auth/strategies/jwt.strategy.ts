import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../../../common/types/auth-user';
import { Env } from '../../../config/env.validation';

/**
 * استراتژی access token. payload خودش نقش‌ها و مجوزها را دارد،
 * پس برای هر درخواست به دیتابیس مراجعه نمی‌کنیم (توکن کوتاه‌عمر است).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  validate(payload: AuthUser & { iat: number; exp: number }): AuthUser {
    return {
      sub: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}
