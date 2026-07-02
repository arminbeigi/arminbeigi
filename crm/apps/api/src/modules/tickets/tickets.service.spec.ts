import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';

/**
 * تست واحد TicketsService — منطق دسته‌بندی خودکار، انتقال وضعیت، تخصیص، کامنت و حذف.
 * وابستگی‌ها mock می‌شوند.
 */
describe('TicketsService', () => {
  let service: TicketsService;
  let repo: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };
  let ai: { classifyTicketText: jest.Mock; recordTicketInsight: jest.Mock };
  let events: { publish: jest.Mock };

  const fullTicket = (over: Record<string, unknown> = {}) => ({
    id: 't1',
    code: 'TCK1',
    subject: 'پکیج خراب',
    description: null,
    category: 'BREAKDOWN',
    priority: 'HIGH',
    status: 'OPEN',
    customerId: 'c1',
    projectId: null,
    assigneeId: null,
    slaDueAt: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { id: 'c1', displayName: 'مشتری' },
    assignee: null,
    project: null,
    comments: [],
    _count: { comments: 0 },
    ...over,
  });

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findById: jest.fn(),
      findCore: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue({ id: 't1' }),
      list: jest.fn(),
      addComment: jest.fn().mockResolvedValue({ id: 'cm1' }),
      customerExists: jest.fn().mockResolvedValue({ id: 'c1' }),
      userExists: jest.fn().mockResolvedValue({ id: 'u2' }),
      projectExists: jest.fn().mockResolvedValue({ id: 'p1' }),
      stats: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    ai = {
      classifyTicketText: jest
        .fn()
        .mockReturnValue({ category: 'BREAKDOWN', priority: 'HIGH', component: 'BOILER', confidence: 0.8, scores: {} }),
      recordTicketInsight: jest.fn().mockResolvedValue(undefined),
    };
    events = { publish: jest.fn() };
    service = new TicketsService(
      repo as unknown as TicketsRepository,
      audit as never,
      ai as never,
      events as never,
    );
  });

  describe('create', () => {
    it('دسته/اولویت نداده‌شده را با AI پر می‌کند و بینش را ثبت می‌کند', async () => {
      repo.create.mockResolvedValue(fullTicket());
      const res = await service.create({ subject: 'پکیج خراب', customerId: 'c1' }, 'admin');
      expect(ai.classifyTicketText).toHaveBeenCalled();
      const created = repo.create.mock.calls[0][0];
      expect(created.category).toBe('BREAKDOWN');
      expect(created.priority).toBe('HIGH');
      expect(ai.recordTicketInsight).toHaveBeenCalledWith('t1', 'c1', expect.any(Object));
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'ticket.created', entityId: 't1' }),
      );
      expect(res.category).toBe('BREAKDOWN');
    });

    it('اگر دسته صریح داده شود، همان حفظ می‌شود', async () => {
      repo.create.mockResolvedValue(fullTicket({ category: 'WARRANTY' }));
      await service.create({ subject: 'گارانتی', customerId: 'c1', category: 'WARRANTY' }, 'admin');
      expect(repo.create.mock.calls[0][0].category).toBe('WARRANTY');
    });

    it('مشتری ناموجود ⇒ 404', async () => {
      repo.customerExists.mockResolvedValue(null);
      await expect(service.create({ subject: 'x', customerId: 'bad' }, 'a')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('changeStatus', () => {
    it('انتقال مجاز OPEN→IN_PROGRESS را اعمال و ممیزی می‌کند', async () => {
      repo.findCore.mockResolvedValue({ id: 't1', status: 'OPEN', customerId: 'c1', assigneeId: null });
      repo.update.mockResolvedValue(fullTicket({ status: 'IN_PROGRESS' }));
      await service.changeStatus('t1', 'IN_PROGRESS', 'admin');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'status_changed', metadata: { from: 'OPEN', to: 'IN_PROGRESS' } }),
      );
    });

    it('انتقال نامجاز CLOSED→WAITING ⇒ خطا', async () => {
      repo.findCore.mockResolvedValue({ id: 't1', status: 'CLOSED', customerId: 'c1', assigneeId: null });
      await expect(service.changeStatus('t1', 'WAITING', 'admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('RESOLVED ⇒ resolvedAt ست می‌شود', async () => {
      repo.findCore.mockResolvedValue({ id: 't1', status: 'IN_PROGRESS', customerId: 'c1', assigneeId: null });
      repo.update.mockResolvedValue(fullTicket({ status: 'RESOLVED' }));
      await service.changeStatus('t1', 'RESOLVED', 'admin');
      expect(repo.update.mock.calls[0][1].resolvedAt).toBeInstanceOf(Date);
    });
  });

  describe('assign', () => {
    it('کاربر ناموجود ⇒ 404', async () => {
      repo.findCore.mockResolvedValue({ id: 't1', status: 'OPEN', customerId: 'c1', assigneeId: null });
      repo.userExists.mockResolvedValue(null);
      await expect(service.assign('t1', { assigneeId: 'bad' }, 'a')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('لغو تخصیص (assigneeId=null) با disconnect', async () => {
      repo.findCore.mockResolvedValue({ id: 't1', status: 'OPEN', customerId: 'c1', assigneeId: 'u9' });
      repo.update.mockResolvedValue(fullTicket());
      await service.assign('t1', { assigneeId: null }, 'admin');
      expect(repo.update.mock.calls[0][1]).toEqual({ assignee: { disconnect: true } });
    });
  });

  describe('addComment', () => {
    it('کامنت می‌سازد و رویداد به‌روزرسانی می‌فرستد', async () => {
      repo.findCore.mockResolvedValue({ id: 't1', status: 'OPEN', customerId: 'c1', assigneeId: null });
      repo.findById.mockResolvedValue(fullTicket());
      await service.addComment('t1', { body: 'سلام' }, 'u1');
      expect(repo.addComment).toHaveBeenCalled();
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ticket.updated',
          payload: expect.objectContaining({ event: 'comment' }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('حذف می‌کند، ممیزی و رویداد می‌فرستد', async () => {
      repo.findCore.mockResolvedValue({ id: 't1', status: 'OPEN', customerId: 'c1', assigneeId: null });
      const res = await service.remove('t1', 'admin');
      expect(res).toEqual({ success: true });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'deleted', entityType: 'TICKET' }),
      );
    });

    it('تیکت ناموجود ⇒ 404', async () => {
      repo.findCore.mockResolvedValue(null);
      await expect(service.remove('bad', 'a')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
