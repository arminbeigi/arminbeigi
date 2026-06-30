// تایپ‌های مشترک پاسخ API (زیرمجموعه‌ی موردنیاز فرانت)

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  extension: string | null;
  roles: string[];
  permissions: string[];
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface Phone {
  id: string;
  number: string;
  label: string | null;
  isPrimary: boolean;
}

export interface Customer {
  id: string;
  code: string;
  type: string;
  status: string;
  displayName: string;
  companyName: string | null;
  leadScore: number;
  ownerName: string | null;
  phones: Phone[];
  createdAt: string;
  updatedAt: string;
}

export interface Call {
  id: string;
  uniqueId: string;
  direction: string;
  status: string;
  fromNumber: string;
  toNumber: string;
  agentName: string | null;
  customerId: string | null;
  customerName: string | null;
  customerType: string | null;
  talkSeconds: number | null;
  startedAt: string;
  intent: string;
}

export interface Deal {
  id: string;
  title: string;
  status: string;
  customerName: string | null;
  stageKey: string | null;
  stageName: string | null;
  amountIrr: string;
  ownerName: string | null;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
}
