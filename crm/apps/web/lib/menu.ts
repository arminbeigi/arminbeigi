import {
  BarChart3,
  Bot,
  FolderKanban,
  Headphones,
  LayoutDashboard,
  Package,
  Phone,
  Settings,
  Ticket,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

/** منوی اصلی — دقیقاً مطابق الزامات فارسی پروژه */
export const MENU: MenuItem[] = [
  { label: 'داشبورد', href: '/dashboard', icon: LayoutDashboard },
  { label: 'مشتریان', href: '/dashboard/customers', icon: Users, permission: 'customers:read' },
  { label: 'پروژه‌ها', href: '/dashboard/projects', icon: FolderKanban, permission: 'projects:read' },
  { label: 'فروش', href: '/dashboard/deals', icon: TrendingUp, permission: 'deals:read' },
  { label: 'تماس‌ها', href: '/dashboard/calls', icon: Phone, permission: 'calls:read' },
  { label: 'مرکز تماس', href: '/dashboard/call-center', icon: Headphones, permission: 'calls:manage' },
  { label: 'محصولات', href: '/dashboard/products', icon: Package, permission: 'products:read' },
  { label: 'تیکت‌ها', href: '/dashboard/tickets', icon: Ticket, permission: 'tickets:read' },
  { label: 'خدمات', href: '/dashboard/services', icon: Wrench },
  { label: 'گزارش‌ها', href: '/dashboard/reports', icon: BarChart3, permission: 'reports:read' },
  { label: 'تنظیمات', href: '/dashboard/settings', icon: Settings },
  { label: 'دستیار هوشمند', href: '/dashboard/assistant', icon: Bot, permission: 'ai:use' },
];
