// Database types for events system (manual, since auto-generated types may lag)
export interface Event {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  date: string;
  end_date: string | null;
  time: string;
  end_time: string | null;
  genre: string | null;
  areas: string | null;
  image_url: string | null;
  ticket_price: number;
  ticket_quantity: number;
  tickets_sold: number;
  is_published: boolean;
  has_muttizettel: boolean;
  has_abendkasse: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string | null;
  ticket_type_id: string | null;
  discount_code_id: string | null;
  quantity: number;
  total_price: number;
  status: string;
  buyer_name: string | null;
  buyer_email: string;
  buyer_phone: string | null;
  qr_code: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  sold: number;
  sort_order: number;
  is_active: boolean;
  sale_start: string | null;
  sale_end: string | null;
  created_at: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  uses: number;
  event_id: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EventTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface EventTagAssignment {
  id: string;
  event_id: string;
  tag_id: string;
}
