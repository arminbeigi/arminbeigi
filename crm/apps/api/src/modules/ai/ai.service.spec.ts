import { IntentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from './ai.service';
import { detectIntent } from './intent';
import { MockLlmProvider } from './providers/mock-llm.provider';
import { MockSttProvider } from './providers/mock-stt.provider';

describe('AI — intent detection', () => {
  it('کلیدواژه‌های فارسی را به نیت درست نگاشت می‌کند', () => {
    expect(detectIntent('پکیج خراب شده و آب گرم نمیده').intent).toBe(IntentType.BREAKDOWN);
    expect(detectIntent('قیمت دیگ چدنی رو میخواستم').intent).toBe(IntentType.PURCHASE);
    expect(detectIntent('برای نصب موتورخانه تماس گرفتم').intent).toBe(IntentType.INSTALLATION);
    expect(detectIntent('سرویس سالیانه پکیج').intent).toBe(IntentType.SERVICE);
    expect(detectIntent('سلام وقت بخیر').intent).toBe(IntentType.UNKNOWN);
  });

  it('با املای عربی (ي/ك) هم کار می‌کند', () => {
    expect(detectIntent('سرويس ساليانه').intent).toBe(IntentType.SERVICE);
  });
});

describe('AiService', () => {
  let service: AiService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(() => {
    prisma = {
      call: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
      },
      customer: { update: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(5) },
      deal: { count: jest.fn().mockResolvedValue(1), aggregate: jest.fn().mockResolvedValue({ _sum: { amountIrr: 6100000000 } }) },
      project: { count: jest.fn().mockResolvedValue(2) },
      product: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'پمپ', sku: 'PMP', category: 'PUMP' }]) },
      aIInsight: { create: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({ count: 3 }) },
    };
    service = new AiService(prisma as unknown as PrismaService, new MockLlmProvider(), new MockSttProvider());
  });

  it('scoreLead: خرید + پاسخ + معامله‌ی باز ⇒ امتیاز بالا', async () => {
    const s = await service.scoreLead('c1', IntentType.PURCHASE, true);
    expect(s).toBe(95); // 30 + 45 + 10 + 10
  });

  it('recommendFromText: «پمپ» ⇒ کوئری محصولات دسته PUMP', async () => {
    const recs = await service.recommendFromText('یک پمپ سیرکولاتور میخوام');
    expect(prisma.product.findMany).toHaveBeenCalled();
    const where = prisma.product.findMany.mock.calls[0][0].where;
    expect(where.category.in).toContain('PUMP');
    expect(recs[0].sku).toBe('PMP');
  });

  it('processCall: رونویسی→خلاصه→نیت→امتیاز و ذخیره‌ی بینش‌ها', async () => {
    prisma.call.findUnique.mockResolvedValue({
      id: 'call1',
      customerId: 'c1',
      status: 'ANSWERED',
      transcript: null,
      recordingPath: '/rec/breakdown-call.wav',
    });
    const res = await service.processCall('call1');
    expect(res.transcript).toBeTruthy(); // از STT mock
    expect(res.summary).toContain('موضوع:');
    expect(res.intent).not.toBe(IntentType.UNKNOWN);
    expect(prisma.call.update).toHaveBeenCalled(); // intent/transcript ذخیره شد
    expect(prisma.aIInsight.createMany).toHaveBeenCalled();
    expect(prisma.customer.update).toHaveBeenCalled(); // امتیاز سرنخ
    expect(typeof res.leadScore).toBe('number');
  });

  it('processCall: بدون متن و بدون ضبط ⇒ تحلیل خالی', async () => {
    prisma.call.findUnique.mockResolvedValue({ id: 'c', customerId: null, transcript: null, recordingPath: null, recordingUrl: null });
    const res = await service.processCall('c');
    expect(res.transcript).toBeNull();
    expect(res.intent).toBe(IntentType.UNKNOWN);
    expect(prisma.aIInsight.createMany).not.toHaveBeenCalled();
  });

  it('assistant: پرسش «چند مشتری» مستقیم از داده پاسخ می‌دهد', async () => {
    const r = await service.assistant('چند مشتری داریم؟');
    expect(prisma.customer.count).toHaveBeenCalled();
    expect(r.answer).toContain('مشتری');
  });
});
