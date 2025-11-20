export type UserRole = 'customer' | 'restaurant' | 'driver' | 'admin';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  status: 'active' | 'locked' | 'pending' | 'blocked';
  createdAt: string;
  orders?: number;
  rating?: number;
  city?: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  icon: string;
  items: number;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

export interface OrderRecord {
  id: string;
  customer: string;
  restaurant: string;
  total: number;
  status: OrderStatus;
  placedAt: string;
  slaRisk?: 'warning' | 'critical';
}

export interface PromotionCampaign {
  id: string;
  name: string;
  type: 'voucher' | 'free-ship' | 'combo';
  usage: number;
  budget: number;
  start: string;
  end: string;
  status: 'scheduled' | 'active' | 'ended';
  owner: string;
}

export interface ReportKPI {
  label: string;
  value: string;
  trend: number;
  subLabel: string;
}

export interface SupportTicket {
  id: string;
  customer: string;
  topic: string;
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'in-progress' | 'resolved';
  updatedAt: string;
  channel: 'app' | 'phone' | 'email';
}

