import { WorkflowService } from './workflow.service';
import type { IWorkflowAction } from './actions/workflow-action.interface';
import type { DomainEvent } from '../../events/domain-event';

/** تست واحد موتور گردش‌کار — trigger/شرط/اکشن/retry/لاگ اجرا */
describe('WorkflowService', () => {
  let prisma: { workflow: Record<string, jest.Mock>; workflowRun: { create: jest.Mock; findMany: jest.Mock } };
  let events: { publish: jest.Mock };
  let notify: IWorkflowAction & { execute: jest.Mock };
  let service: WorkflowService;

  const event: DomainEvent = {
    name: 'ticket.created' as DomainEvent['name'],
    occurredAt: new Date(),
    actorId: 'u1',
    entityType: 'TICKET',
    entityId: 't1',
    title: 'تیکت ساخته شد',
    payload: { priority: 'HIGH', assigneeId: 'u9' },
  };

  beforeEach(() => {
    prisma = {
      workflow: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'w1' }),
        update: jest.fn(),
        delete: jest.fn(),
      },
      workflowRun: { create: jest.fn().mockResolvedValue({ id: 'r1' }), findMany: jest.fn() },
    };
    events = { publish: jest.fn() };
    notify = { type: 'notify', execute: jest.fn().mockResolvedValue({ ok: true, detail: 'sent' }) };
    service = new WorkflowService(prisma as never, events as never, [notify]);
  });

  it('شرط برقرار ⇒ اکشن اجرا و SUCCESS + رویداد workflow.executed', async () => {
    prisma.workflow.findMany.mockResolvedValue([
      {
        id: 'w1',
        conditions: [{ field: 'priority', op: 'eq', value: 'HIGH' }],
        actions: [{ type: 'notify', params: { userIdField: 'assigneeId' } }],
      },
    ]);
    await service.handleEvent(event);
    expect(notify.execute).toHaveBeenCalledTimes(1);
    const run = prisma.workflowRun.create.mock.calls[0][0].data;
    expect(run.status).toBe('SUCCESS');
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'workflow.executed', payload: expect.objectContaining({ failed: false }) }),
    );
  });

  it('شرط برقرار نیست ⇒ SKIPPED بدون اجرای اکشن', async () => {
    prisma.workflow.findMany.mockResolvedValue([
      { id: 'w1', conditions: [{ field: 'priority', op: 'eq', value: 'LOW' }], actions: [{ type: 'notify' }] },
    ]);
    await service.handleEvent(event);
    expect(notify.execute).not.toHaveBeenCalled();
    expect(prisma.workflowRun.create.mock.calls[0][0].data.status).toBe('SKIPPED');
  });

  it('retry: پس از شکست اول، تلاش مجدد و موفقیت', async () => {
    notify.execute.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ ok: true });
    prisma.workflow.findMany.mockResolvedValue([
      { id: 'w1', conditions: [], actions: [{ type: 'notify', retries: 2 }] },
    ]);
    await service.handleEvent(event);
    expect(notify.execute).toHaveBeenCalledTimes(2);
    const run = prisma.workflowRun.create.mock.calls[0][0].data;
    expect(run.status).toBe('SUCCESS');
    expect((run.log as { attempts: number }[])[0].attempts).toBe(2);
  });

  it('اکشن ناشناخته ⇒ FAILED در لاگ', async () => {
    prisma.workflow.findMany.mockResolvedValue([
      { id: 'w1', conditions: [], actions: [{ type: 'send-fax' }] },
    ]);
    await service.handleEvent(event);
    expect(prisma.workflowRun.create.mock.calls[0][0].data.status).toBe('FAILED');
  });

  it('رویداد workflow.executed خودش تریگر نمی‌شود (ضد حلقه)', async () => {
    await service.handleEvent({ ...event, name: 'workflow.executed' as DomainEvent['name'] });
    expect(prisma.workflow.findMany).not.toHaveBeenCalled();
  });

  it('availableActions اکشن‌های ثبت‌شده را برمی‌گرداند', () => {
    expect(service.availableActions()).toEqual(['notify']);
  });
});
