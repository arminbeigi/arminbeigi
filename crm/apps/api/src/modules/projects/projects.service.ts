import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateProjectItemDto } from './dto/create-project-item.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectFilters, ProjectsRepository } from './projects.repository';

/** انتقال‌های مجاز وضعیت پروژه (گردش‌کار HVAC) */
const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['SURVEY', 'CANCELLED'],
  SURVEY: ['PROPOSAL', 'CANCELLED'],
  PROPOSAL: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository) {}

  async create(dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const { customerId, addressId, managerId, items, scheduledAt, status, ...rest } = dto;
    const base: Prisma.ProjectCreateInput = {
      ...rest,
      ...(status ? { status } : {}),
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      customer: { connect: { id: customerId } },
      ...(addressId ? { address: { connect: { id: addressId } } } : {}),
      ...(managerId ? { manager: { connect: { id: managerId } } } : {}),
    };
    try {
      const created = await this.repo.create({ base, items: items ?? [] });
      return ProjectResponseDto.from(created);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
  }

  async findOne(id: string): Promise<ProjectResponseDto> {
    const project = await this.repo.findById(id);
    if (!project) throw new NotFoundException('پروژه یافت نشد');
    return ProjectResponseDto.from(project);
  }

  async search(query: QueryProjectsDto): Promise<PaginatedResult<ProjectResponseDto>> {
    const filters: ProjectFilters = {
      type: query.type,
      status: query.status,
      customerId: query.customerId,
      managerId: query.managerId,
    };
    const q = query.q?.trim();
    if (q) {
      const { ids, total } = await this.repo.fuzzySearchIds({
        q,
        filters,
        skip: query.skip,
        take: query.limit,
      });
      const rows = await this.repo.findManyByIdsOrdered(ids);
      return new PaginatedResult(rows.map(ProjectResponseDto.from), total, query.page, query.limit);
    }
    const { data, total } = await this.repo.list({ filters, skip: query.skip, take: query.limit });
    return new PaginatedResult(data.map(ProjectResponseDto.from), total, query.page, query.limit);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    const current = await this.repo.findById(id);
    if (!current) throw new NotFoundException('پروژه یافت نشد');

    const { status, managerId, addressId, scheduledAt, completedAt, finalIrr, ...rest } = dto;
    const data: Prisma.ProjectUpdateInput = { ...rest };

    if (managerId) data.manager = { connect: { id: managerId } };
    if (addressId) data.address = { connect: { id: addressId } };
    if (scheduledAt) data.scheduledAt = new Date(scheduledAt);
    if (finalIrr !== undefined) data.finalIrr = finalIrr;

    if (status && status !== current.status) {
      this.assertTransition(current.status, status);
      data.status = status;
      if (status === ProjectStatus.COMPLETED) {
        data.completedAt = completedAt ? new Date(completedAt) : new Date();
      }
    } else if (completedAt) {
      data.completedAt = new Date(completedAt);
    }

    try {
      const updated = await this.repo.update(id, data);
      return ProjectResponseDto.from(updated);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.ensureExists(id);
    await this.repo.delete(id);
    return { success: true };
  }

  async addItem(projectId: string, dto: CreateProjectItemDto): Promise<ProjectResponseDto> {
    await this.ensureExists(projectId);
    try {
      await this.repo.addItem(projectId, dto);
    } catch (e) {
      throw this.translatePrismaError(e);
    }
    return this.findOne(projectId);
  }

  async removeItem(projectId: string, itemId: string): Promise<ProjectResponseDto> {
    const item = await this.repo.findItem(projectId, itemId);
    if (!item) throw new NotFoundException('قلم پروژه یافت نشد');
    await this.repo.deleteItem(itemId);
    return this.findOne(projectId);
  }

  // ── کمکی‌ها ─────────────────────────────────────────────────────────────────
  private assertTransition(from: ProjectStatus, to: ProjectStatus): void {
    if (!TRANSITIONS[from].includes(to)) {
      throw new BadRequestException(`انتقال وضعیت از «${from}» به «${to}» مجاز نیست`);
    }
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException('پروژه یافت نشد');
  }

  private translatePrismaError(e: unknown): Error {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') return new NotFoundException('مشتری/آدرس/مدیر/محصول مرتبط یافت نشد');
    }
    return e instanceof Error ? e : new Error('خطای ناشناخته');
  }
}
