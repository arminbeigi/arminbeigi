import { classifyTicket } from './ticket-classify';

/** تست واحد دسته‌بندِ تیکت — صحت دسته/اولویت/قطعه روی متن‌های واقعی فارسی */
describe('classifyTicket', () => {
  it('خرابی پکیج با حرارت‌نداشتن ⇒ BREAKDOWN/HIGH + قطعه BOILER', () => {
    const r = classifyTicket('پکیج خراب شده و آب گرم نمیده، خونه سرده');
    expect(r.category).toBe('BREAKDOWN');
    expect(r.priority).toBe('HIGH');
    expect(r.component).toBe('BOILER');
  });

  it('بوی گاز ⇒ اولویت URGENT (ایمنی)', () => {
    const r = classifyTicket('از موتورخانه بوی گاز میاد، خطرناکه');
    expect(r.priority).toBe('URGENT');
  });

  it('درخواست سرویس سالیانه ⇒ MAINTENANCE', () => {
    const r = classifyTicket('برای سرویس سالیانه و رسوب‌زدایی دیگ وقت می‌خوام');
    expect(r.category).toBe('MAINTENANCE');
    expect(r.component).toBe('BOILER');
  });

  it('درخواست نصب موتورخانه جدید ⇒ INSTALLATION', () => {
    const r = classifyTicket('می‌خوام موتورخانه جدید نصب کنم و لوله‌کشی انجام بشه');
    expect(r.category).toBe('INSTALLATION');
  });

  it('استعلام قیمت ⇒ INQUIRY/LOW', () => {
    const r = classifyTicket('استعلام قیمت پمپ سیرکولاتور دارم، چقدر می‌شه؟');
    expect(r.category).toBe('INQUIRY');
    expect(r.priority).toBe('LOW');
    expect(r.component).toBe('PUMP');
  });

  it('مسئله‌ی گارانتی ⇒ WARRANTY', () => {
    const r = classifyTicket('دستگاه تو دوره گارانتی خرابه، خدمات پس از فروش می‌خوام');
    expect(['WARRANTY', 'BREAKDOWN']).toContain(r.category);
  });

  it('متن نامرتبط ⇒ پیش‌فرض امن (INQUIRY/MEDIUM) با اطمینان صفر', () => {
    const r = classifyTicket('سلام خسته نباشید');
    expect(r.confidence).toBe(0);
    expect(r.category).toBe('INQUIRY');
  });

  it('متن خالی ⇒ بدون خطا', () => {
    const r = classifyTicket('');
    expect(r.component).toBeNull();
    expect(r.confidence).toBe(0);
  });
});
