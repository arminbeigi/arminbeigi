import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IntentType, Prisma, ProductCategory } from '@prisma/client';
import { faNormalizeText } from '../../common/utils/persian';
import { PrismaService } from '../../prisma/prisma.service';
import { detectIntent } from './intent';
import { classifyTicket, TicketClassification } from './ticket-classify';
import {
  ILlmProvider,
  ISttProvider,
  LLM_PROVIDER,
  STT_PROVIDER,
} from './providers/ai-provider.interface';

export interface CallAnalysis {
  callId: string;
  transcript: string | null;
  summary: string | null;
  intent: IntentType;
  confidence: number;
  leadScore: number | null;
  recommendations: { id: string; name: string; sku: string; category: string }[];
}

// نگاشت کلیدواژه‌ی محصول → دسته (برای موتور پیشنهاد)
const PRODUCT_HINTS: { words: string[]; category: ProductCategory }[] = [
  { words: ['پکیج', 'دیگ', 'بویلر', 'شوفاژ'], category: ProductCategory.BOILER },
  { words: ['مشعل'], category: ProductCategory.BURNER },
  { words: ['پمپ', 'سیرکولاتور'], category: ProductCategory.PUMP },
  { words: ['منبع', 'مخزن', 'انبساط'], category: ProductCategory.TANK },
  { words: ['رادیاتور', 'شوفاژ پره'], category: ProductCategory.RADIATOR },
];

@Injectable()
export class AiService {
  private readonly logger = new Logger('AI');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llm: ILlmProvider,
    @Inject(STT_PROVIDER) private readonly stt: ISttProvider,
  ) {}

  status(): { llm: 'mock' | 'real'; stt: 'mock' | 'real' } {
    return { llm: this.llm.mode(), stt: this.stt.mode() };
  }

  /**
   * دسته‌بندی متن تیکت (موضوع + توضیحات) به دسته/اولویت/قطعه — موتور قاعده‌محورِ فارسی.
   * بدون اثر جانبی؛ ماژول تیکت برای پیشنهاد مقادیر اولیه از این استفاده می‌کند.
   */
  classifyTicketText(text: string | null | undefined): TicketClassification {
    return classifyTicket(text);
  }

  /** ثبت بینش دسته‌بندی تیکت در AIInsight (پس از ساخت/به‌روزرسانی تیکت). */
  async recordTicketInsight(
    ticketId: string,
    customerId: string | null,
    result: TicketClassification,
  ): Promise<void> {
    await this.prisma.aIInsight.create({
      data: {
        type: 'TICKET_CLASSIFICATION',
        entityType: 'TICKET',
        ticketId,
        customerId,
        confidence: result.confidence,
        model: this.llm.mode() === 'mock' ? 'rules-fa' : 'self-hosted',
        payload: {
          category: result.category,
          priority: result.priority,
          component: result.component,
          scores: result.scores,
        },
      },
    });
  }

  /**
   * خط لوله‌ی تحلیل تماس: رونویسی (در صورت نبود) → خلاصه → نیت → امتیاز سرنخ → پیشنهاد محصول.
   * همه‌ی نتایج در AIInsight ذخیره و فیلدهای مرتبط (Call.intent/transcript, Customer.leadScore) به‌روزرسانی می‌شوند.
   */
  async processCall(callId: string): Promise<CallAnalysis> {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('تماس یافت نشد');

    // ۱) رونویسی
    let transcript = call.transcript;
    if (!transcript && (call.recordingPath || call.recordingUrl)) {
      transcript = await this.stt.transcribe(call.recordingPath ?? call.recordingUrl!);
    }

    if (!transcript) {
      // بدون متن، تحلیلی ممکن نیست
      return {
        callId,
        transcript: null,
        summary: null,
        intent: IntentType.UNKNOWN,
        confidence: 0,
        leadScore: null,
        recommendations: [],
      };
    }

    // ۲) خلاصه و ۳) نیت
    const summary = await this.llm.summarize(transcript);
    const { intent, confidence } = detectIntent(transcript);

    // ۴) پیشنهاد محصول و ۵) امتیاز سرنخ
    const recommendations = await this.recommendFromText(transcript);
    const modelLabel = this.llm.mode() === 'mock' ? 'mock-llm' : 'self-hosted';

    await this.prisma.call.update({
      where: { id: callId },
      data: { transcript, intent },
    });

    // ذخیره‌ی بینش‌ها
    const baseLink = { entityType: 'CALL' as const, callId, customerId: call.customerId ?? undefined };
    await this.prisma.aIInsight.createMany({
      data: [
        { ...baseLink, type: 'CALL_SUMMARY', summary, model: modelLabel },
        { ...baseLink, type: 'CALL_INTENT', intent, confidence, model: modelLabel },
        {
          ...baseLink,
          type: 'PRODUCT_RECOMMENDATION',
          payload: recommendations as unknown as Prisma.InputJsonValue,
          model: modelLabel,
        },
      ],
    });

    let leadScore: number | null = null;
    if (call.customerId) {
      leadScore = await this.scoreLead(call.customerId, intent, call.status === 'ANSWERED');
      await this.prisma.customer.update({
        where: { id: call.customerId },
        data: { leadScore },
      });
      await this.prisma.aIInsight.create({
        data: {
          type: 'LEAD_SCORE',
          entityType: 'CUSTOMER',
          customerId: call.customerId,
          callId,
          score: leadScore,
          model: modelLabel,
        },
      });
    }

    return { callId, transcript, summary, intent, confidence, leadScore, recommendations };
  }

  /** امتیاز سرنخ (۰..۱۰۰) بر اساس نیت، پاسخ‌دهی تماس و وجود معامله‌ی باز */
  async scoreLead(customerId: string, intent: IntentType, answered: boolean): Promise<number> {
    const openDeals = await this.prisma.deal.count({
      where: { customerId, status: 'OPEN' },
    });
    let score = 30;
    const intentWeight: Record<IntentType, number> = {
      PURCHASE: 45,
      INSTALLATION: 30,
      SERVICE: 15,
      BREAKDOWN: 20,
      UNKNOWN: 0,
    };
    score += intentWeight[intent];
    if (answered) score += 10;
    if (openDeals > 0) score += 10;
    return Math.max(0, Math.min(100, score));
  }

  /** موتور پیشنهاد محصول: دسته‌ها را از متن استخراج و محصولات فعال مرتبط را برمی‌گرداند */
  async recommendFromText(text: string): Promise<CallAnalysis['recommendations']> {
    const norm = faNormalizeText(text);
    const categories = new Set<ProductCategory>();
    for (const hint of PRODUCT_HINTS) {
      if (hint.words.some((w) => norm.includes(faNormalizeText(w)))) categories.add(hint.category);
    }
    if (categories.size === 0) return [];
    const products = await this.prisma.product.findMany({
      where: { isActive: true, category: { in: [...categories] } },
      orderBy: [{ stockQty: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: { id: true, name: true, sku: true, category: true },
    });
    return products;
  }

  /** پیشنهاد بر اساس آخرین تماسِ مشتری (برای دکمه‌ی پیشنهاد در پرونده‌ی مشتری) */
  async recommendForCustomer(customerId: string): Promise<CallAnalysis['recommendations']> {
    const lastCall = await this.prisma.call.findFirst({
      where: { customerId, transcript: { not: null } },
      orderBy: { startedAt: 'desc' },
    });
    if (!lastCall?.transcript) return [];
    return this.recommendFromText(lastCall.transcript);
  }

  /** دستیار فارسی: پرسش‌های متداول را مستقیماً از داده پاسخ می‌دهد، بقیه به LLM می‌رود */
  async assistant(query: string): Promise<{ answer: string; data?: unknown }> {
    const q = faNormalizeText(query);

    if (q.includes('مشتری')) {
      const total = await this.prisma.customer.count();
      const leads = await this.prisma.customer.count({ where: { status: 'LEAD' } });
      return { answer: `در حال حاضر ${total} مشتری ثبت شده که ${leads} مورد سرنخ است.`, data: { total, leads } };
    }
    if (q.includes('معامل') || q.includes('فروش')) {
      const open = await this.prisma.deal.count({ where: { status: 'OPEN' } });
      const agg = await this.prisma.deal.aggregate({ where: { status: 'OPEN' }, _sum: { amountIrr: true } });
      const sumToman = Math.round(Number(agg._sum.amountIrr ?? 0) / 10);
      return {
        answer: `${open} معامله‌ی باز با ارزش تقریبی ${sumToman.toLocaleString('en-US')} تومان در جریان است.`,
        data: { open, sumToman },
      };
    }
    if (q.includes('تماس')) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const today = await this.prisma.call.count({ where: { startedAt: { gte: since } } });
      return { answer: `امروز ${today} تماس ثبت شده است.`, data: { today } };
    }
    if (q.includes('پروژه')) {
      const inProgress = await this.prisma.project.count({ where: { status: 'IN_PROGRESS' } });
      return { answer: `${inProgress} پروژه در حال اجراست.`, data: { inProgress } };
    }

    // پرسش ناشناخته → LLM با زمینه‌ی آماری مختصر
    const [customers, deals, projects] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.deal.count({ where: { status: 'OPEN' } }),
      this.prisma.project.count(),
    ]);
    const context = `تعداد مشتریان: ${customers}، معاملات باز: ${deals}، پروژه‌ها: ${projects}.`;
    const answer = await this.llm.assistantAnswer(query, context);
    return { answer };
  }

  async listInsights(params: { callId?: string; customerId?: string; type?: string }) {
    return this.prisma.aIInsight.findMany({
      where: {
        ...(params.callId ? { callId: params.callId } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.type ? { type: params.type as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
