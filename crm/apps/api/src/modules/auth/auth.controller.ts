import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { UserResponseDto } from '../../modules/users/dto/user-response.dto';
import { UsersService } from '../../modules/users/users.service';
import { AuthService } from './auth.service';
import { AuthTokensDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

// سقف سخت‌گیرانه برای مسیرهای حساس احراز هویت: حداکثر ۱۰ تلاش در دقیقه به‌ازای هر IP.
const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 10 } };

@ApiTags('احراز هویت')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @ApiOperation({ summary: 'ثبت‌نام کاربر جدید (نقش پیش‌فرض: فقط مشاهده)' })
  register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ورود و دریافت توکن دسترسی/تازه‌سازی' })
  login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.auth.login(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'چرخش توکن (با تشخیص استفاده‌ی مجدد)' })
  refresh(@Body() dto: RefreshDto): Promise<AuthTokensDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'خروج و ابطال توکن تازه‌سازی' })
  logout(@Body() dto: RefreshDto): Promise<{ success: true }> {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'پروفایل کاربر جاری (با نقش‌ها و مجوزهای به‌روز)' })
  async me(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    const profile = await this.users.getProfile(user.sub);
    return UserResponseDto.fromWithAccess(profile);
  }
}
