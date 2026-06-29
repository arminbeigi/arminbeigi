/** شکل کاربرِ احرازشده که از توکن استخراج و به request پیوست می‌شود */
export interface AuthUser {
  sub: string; // userId
  email: string;
  fullName: string;
  roles: string[]; // کلید نقش‌ها: admin, sales_agent, ...
  permissions: string[]; // کلید مجوزها: customers:read, ...
}
