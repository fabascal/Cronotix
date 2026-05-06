import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../../database/entities/role.entity';
import { User } from '../../database/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Roles ──────────────────────────────────────────────────────────────────

  findAllRoles(): Promise<Role[]> {
    return this.roleRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOneRole(id: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`El rol "${dto.name}" ya existe`);
    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      permissions: dto.permissions,
    });
    return this.roleRepo.save(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOneRole(id);
    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description ?? null;
    if (dto.permissions !== undefined) role.permissions = dto.permissions;
    if (dto.isActive !== undefined) role.isActive = dto.isActive;
    return this.roleRepo.save(role);
  }

  async removeRole(id: string): Promise<void> {
    const role = await this.findOneRole(id);
    await this.roleRepo.remove(role);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  findAllUsers(): Promise<User[]> {
    return this.userRepo.find({
      relations: ['rbacRole'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneUser(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['rbacRole'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(`El email ${dto.email} ya está registrado`);
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      passwordHash,
      role: dto.role ?? 'user',
      roleId: dto.roleId ?? null,
      tenantId: dto.tenantId ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.userRepo.save(user);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOneUser(id);
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email.toLowerCase();
    if (dto.role !== undefined) user.role = dto.role;
    if ('roleId' in dto) user.roleId = dto.roleId ?? null;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 12);
    }
    return this.userRepo.save(user);
  }

  async removeUser(id: string): Promise<void> {
    const user = await this.findOneUser(id);
    await this.userRepo.remove(user);
  }
}
