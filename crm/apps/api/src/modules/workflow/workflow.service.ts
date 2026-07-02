import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PluginRegistry } from '../../plugins/plugin-registry.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEvent } from '../../events/domain-event';
import { DomainEventBus } from '../../events/domain-event-bus';
import { DomainEvents } from '../../events/event-names';
import { IWorkflowAction, WORKFLOW_ACTIONS } from './actions/workflow-action.interface';
import { evaluateConditions, WorkflowAction, WorkflowCondition } from './workflow.types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, Math.min(ms, 10_000)));

/**
 * موتور گردش‌کار: trigger (رویداد دامنه) + شرط‌ها (AND) + اکشن‌ها (با delay/retry) و
 * ثبت کامل لاگ اجرا (WorkflowRun). خطای هیچ اکشنی جریان اصلی برنامه را نمی‌شکند.
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger('Workflow');
  private readonly actionMap: Map<string, IWorkflowAction>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DomainEventBus,
    @Inject(WORKFLOW_ACTIONS) actions: IWorkflowAction[],
    @Optional() private readonly pluginRegistry?: PluginRegistry,
  ) {
    this.actionMap = new Map(actions.map((a) => [a.type, a]));
  }

  /** یافتن اکشن: ابتدا builtin ها، سپس اکشن‌های ثبت‌شده‌ی افزونه‌ها. */
  private resolveAction(type: string): IWorkflowAction | undefined {
    return this.actionMap.get(type) ?? this.pluginRegistry?.workflowActions.find((a) => a.type === type);
  }

  /** انواع اکشن‌های در دسترس (builtin + افزونه‌ها). */
  availableActions(): string[] {
    return [
      ...this.actionMap.keys(),
      ...(this.pluginRegistry?.workflowActions.map((a) => a.type) ?? []),
    ];
  }

  /** فراخوانی‌شده از شنونده برای هر رویداد دامنه. */
  async handleEvent(event: DomainEvent): Promise<void> {
    // جلوگیری از حلقه: رویداد اجرای گردش‌کار، خودش گردش‌کار را تریگر نمی‌کند.
    if (event.name === DomainEvents.WorkflowExecuted) return;
    try {
      const workflows = await this.prisma.workflow.findMany({
        where: { triggerEvent: event.name, isActive: true },
      });
      for (const wf of workflows) {
        await this.runWorkflow(wf.id, wf.conditions, wf.actions, event);
      }
    } catch (err) {
      this.logger.warn(`اجرای گردش‌کار برای ${event.name} خطا داد: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async runWorkflow(
    workflowId: string,
    conditionsJson: Prisma.JsonValue,
    actionsJson: Prisma.JsonValue,
    event: DomainEvent,
  ): Promise<void> {
    const conditions = (conditionsJson as unknown as WorkflowCondition[]) ?? [];
    const actions = (actionsJson as unknown as WorkflowAction[]) ?? [];

    // شرط‌ها برقرار نیست ⇒ SKIPPED
    if (!evaluateConditions(conditions, event)) {
      await this.prisma.workflowRun.create({
        data: {
          workflowId,
          eventName: event.name,
          entityType: event.entityType,
          entityId: event.entityId,
          status: 'SKIPPED',
          finishedAt: new Date(),
        },
      });
      return;
    }

    const log: { type: string; ok: boolean; detail?: string; attempts: number }[] = [];
    let failed = false;

    for (const action of actions) {
      const handler = this.resolveAction(action.type);
      if (!handler) {
        log.push({ type: action.type, ok: false, detail: 'اکشن ناشناخته', attempts: 0 });
        failed = true;
        continue;
      }
      if (action.delayMs) await sleep(action.delayMs);

      // retry: (retries ?? 0) تلاش مجدد پس از اولین شکست
      const maxAttempts = (action.retries ?? 0) + 1;
      let attempt = 0;
      let ok = false;
      let detail: string | undefined;
      while (attempt < maxAttempts && !ok) {
        attempt++;
        try {
          const res = await handler.execute(action, event);
          ok = res.ok;
          detail = res.detail;
        } catch (err) {
          detail = err instanceof Error ? err.message : String(err);
        }
      }
      log.push({ type: action.type, ok, detail, attempts: attempt });
      if (!ok) failed = true;
    }

    await this.prisma.workflowRun.create({
      data: {
        workflowId,
        eventName: event.name,
        entityType: event.entityType,
        entityId: event.entityId,
        status: failed ? 'FAILED' : 'SUCCESS',
        log: log as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });

    // انتشار رویداد اجرای گردش‌کار (برای Timeline/گزارش)
    this.events.publish({
      name: DomainEvents.WorkflowExecuted,
      entityType: event.entityType,
      entityId: event.entityId,
      title: `گردش‌کار اجرا شد (${failed ? 'ناموفق' : 'موفق'})`,
      payload: { workflowId, sourceEvent: event.name, failed },
    });
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  create(data: {
    name: string;
    description?: string;
    triggerEvent: string;
    conditions?: unknown;
    actions?: unknown;
    isActive?: boolean;
  }) {
    return this.prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        triggerEvent: data.triggerEvent,
        conditions: (data.conditions ?? []) as Prisma.InputJsonValue,
        actions: (data.actions ?? []) as Prisma.InputJsonValue,
        isActive: data.isActive ?? true,
      },
    });
  }

  list() {
    return this.prisma.workflow.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const wf = await this.prisma.workflow.findUnique({
      where: { id },
      include: { runs: { take: 20, orderBy: { startedAt: 'desc' } } },
    });
    if (!wf) throw new NotFoundException('گردش‌کار یافت نشد');
    return wf;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      triggerEvent: string;
      conditions: unknown;
      actions: unknown;
      isActive: boolean;
    }>,
  ) {
    await this.ensureExists(id);
    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.triggerEvent !== undefined ? { triggerEvent: data.triggerEvent } : {}),
        ...(data.conditions !== undefined ? { conditions: data.conditions as Prisma.InputJsonValue } : {}),
        ...(data.actions !== undefined ? { actions: data.actions as Prisma.InputJsonValue } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.ensureExists(id);
    await this.prisma.workflow.delete({ where: { id } });
    return { success: true };
  }

  runs(workflowId: string) {
    return this.prisma.workflowRun.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  private async ensureExists(id: string): Promise<void> {
    if (!(await this.prisma.workflow.findUnique({ where: { id }, select: { id: true } })))
      throw new NotFoundException('گردش‌کار یافت نشد');
  }
}
