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
  did?: string | null;
  queue?: string | null;
  agentName: string | null;
  customerId: string | null;
  customerName: string | null;
  customerType: string | null;
  customerStatus?: string | null;
  dealId?: string | null;
  ticketId?: string | null;
  waitSeconds?: number | null;
  talkSeconds: number | null;
  startedAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  recordingUrl?: string | null;
  transcript?: string | null;
  intent: string;
}

export interface ProductRec {
  id: string;
  name: string;
  sku: string;
  category: string;
}

export interface CallAnalysis {
  callId: string;
  transcript: string | null;
  summary: string | null;
  intent: string;
  confidence: number;
  leadScore: number | null;
  recommendations: ProductRec[];
}

export interface AiInsight {
  id: string;
  type: string;
  summary: string | null;
  intent: string | null;
  score: number | null;
  confidence: number | null;
  payload: unknown;
  model: string | null;
  ticketId?: string | null;
  createdAt: string;
}

export interface AiStatus {
  llm: 'mock' | 'real';
  stt: 'mock' | 'real';
}

export interface CrmPopup {
  call: Call;
  matched: boolean;
  leadCreated: boolean;
  agentExtension?: string;
}

export interface Deal {
  id: string;
  title: string;
  status: string;
  customerId: string;
  customerName: string | null;
  pipelineId: string;
  stageId: string;
  stageKey: string | null;
  stageName: string | null;
  amountIrr: string;
  ownerName: string | null;
  lostReason: string | null;
}

export interface DealStage {
  id: string;
  key: string;
  name: string;
  order: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: DealStage[];
}

export interface Brand {
  id: string;
  name: string;
  nameFa: string | null;
  country: string | null;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  boilerKind: string;
  fuelType: string;
  brandId: string | null;
  brandName: string | null;
  description: string | null;
  capacityKcal: number | null;
  capacityKw: number | null;
  material: string | null;
  priceIrr: string | null;
  stockQty: number;
  warrantyMo: number | null;
  isActive: boolean;
}

export interface ProjectItem {
  id: string;
  title: string;
  quantity: number;
  unitIrr: string;
  productId: string | null;
  productName: string | null;
}

export interface Project {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  customerId: string;
  customerName: string | null;
  managerId: string | null;
  managerName: string | null;
  description: string | null;
  buildingArea: number | null;
  floors: number | null;
  units: number | null;
  heatLoadKcal: number | null;
  estimatedIrr: string | null;
  finalIrr: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  items: ProjectItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
}

export interface TelephonyStatus {
  mode: 'mock' | 'real';
  connected: boolean;
}

export interface OriginateResult {
  uniqueId: string;
  actionId: string;
}

// ── تیکت‌ها / پشتیبانی ────────────────────────────────────────────────────────
export interface TicketComment {
  id: string;
  body: string;
  isInternal: boolean;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  code: string;
  subject: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  customerId: string;
  customerName: string | null;
  projectId: string | null;
  projectTitle: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  slaDueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  commentsCount: number;
  comments?: TicketComment[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketStats {
  byStatus: Record<string, number>;
  overdue: number;
}

// ── تایم‌لاین ─────────────────────────────────────────────────────────────────
export interface TimelineEntry {
  id: string;
  occurredAt: string;
  eventName: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  actorName: string | null;
  title: string;
  summary: string | null;
  meta: unknown;
  createdAt: string;
}

// ── تجهیزات ───────────────────────────────────────────────────────────────────
export interface Asset {
  id: string;
  code: string;
  name: string;
  kind: string;
  status: string;
  serialNumber: string | null;
  brandName: string | null;
  modelName: string | null;
  customerId: string;
  projectId: string | null;
  productId: string | null;
  installedAt: string | null;
  warrantyUntil: string | null;
  location: string | null;
  notes: string | null;
  customer?: { id: string; displayName: string } | null;
  project?: { id: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
}
