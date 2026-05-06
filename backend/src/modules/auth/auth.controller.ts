import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Autenticar con email y contraseña, retorna JWT' })
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto) {
    const { access_token, user } = await this.authService.loginWithPassword(
      body.email,
      body.password,
    );
    const permissions = this.authService.resolvePermissions(user as Parameters<typeof this.authService.resolvePermissions>[0]);
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions,
        credits: 0,
      },
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna info del usuario autenticado' })
  async me(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token requerido');
    }
    const token = authHeader.slice(7);
    const payload = await this.authService.validateToken(token);

    // Reload user to get fresh permissions from DB
    const user = await this.authService.getUserWithPermissions(payload.sub);
    const permissions = user
      ? this.authService.resolvePermissions(user)
      : payload.permissions ?? [];

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      permissions,
      credits: 0,
    };
  }
}
