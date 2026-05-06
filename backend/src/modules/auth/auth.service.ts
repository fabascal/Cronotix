import {
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  /** '*' for superadmin; list of menu slugs otherwise */
  permissions: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /** Login con email + contraseña (para usuarios del dashboard) */
  async loginWithPassword(
    email: string,
    password: string,
  ): Promise<{ access_token: string; user: Omit<User, 'passwordHash'> }> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase().trim(), isActive: true },
      select: ['id', 'email', 'name', 'role', 'isActive', 'tenantId', 'roleId', 'passwordHash', 'createdAt', 'updatedAt'],
      relations: ['rbacRole'],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const permissions = this.resolvePermissions(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      permissions,
    };

    const access_token = await this.jwtService.signAsync(payload);
    this.logger.log(`User ${user.email} logged in`);

    const { passwordHash: _omit, ...userWithoutHash } = user;
    return { access_token, user: userWithoutHash };
  }

  /** Login con API Key (para integraciones de Portal B) */
  async loginWithApiKey(
    apiKey: string,
  ): Promise<{ access_token: string; tenant: Tenant }> {
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const tenant = await this.tenantRepo.findOne({
      where: { apiKeyHash: keyHash, isActive: true },
    });

    if (!tenant) {
      throw new UnauthorizedException('API Key inválida');
    }

    const payload: JwtPayload = {
      sub: tenant.id,
      email: `tenant-${tenant.id}@cronotix.io`,
      name: tenant.name,
      role: 'admin',
      tenantId: tenant.id,
      permissions: ['*'],
    };

    const access_token = await this.jwtService.signAsync(payload);
    return { access_token, tenant };
  }

  async validateToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }

  /** Carga el usuario completo con su rol RBAC para construir permissions[] */
  async getUserWithPermissions(userId: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id: userId },
      relations: ['rbacRole'],
    });
  }

  /** superadmin → ['*']; RBAC role → role.permissions; sin rol → [] */
  resolvePermissions(user: User): string[] {
    if (user.role === 'superadmin') return ['*'];
    if (user.rbacRole?.permissions?.length) return user.rbacRole.permissions;
    return [];
  }

  /** Crea un usuario. Lanza ConflictException si el email ya existe. */
  async createUser(params: {
    email: string;
    password: string;
    name: string;
    role?: User['role'];
    tenantId?: string;
  }): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: { email: params.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(`El email ${params.email} ya está registrado`);
    }

    const passwordHash = await bcrypt.hash(params.password, 12);
    const user = this.userRepo.create({
      email: params.email.toLowerCase(),
      name: params.name,
      passwordHash,
      role: params.role ?? 'admin',
      tenantId: params.tenantId ?? null,
    });
    return this.userRepo.save(user);
  }

  generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
    const rawKey = `crtx_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(-8);
    return { rawKey, keyHash, keyPrefix };
  }
}
