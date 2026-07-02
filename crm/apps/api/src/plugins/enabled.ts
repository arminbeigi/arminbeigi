import { ShofazhPlugin } from './plugin.interface';
import { SmsMockPlugin } from './examples/sms-mock/sms-mock.plugin';

/**
 * فهرست افزونه‌های فعال. نصب افزونه = افزودن یک خط اینجا (هسته تغییری نمی‌کند).
 * افزونه‌های آینده: ERP، حسابداری، ووکامرس/وردپرس، پیامک واقعی، واتس‌اپ، Issabel،
 * درگاه پرداخت، حمل‌ونقل.
 */
export const ENABLED_PLUGINS: ShofazhPlugin[] = [SmsMockPlugin];
