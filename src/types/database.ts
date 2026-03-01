// Database types for events system (manual, since auto-generated types may lag)
export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  genre: string | null;
  areas: string | null;
  image_url: string | null;
  ticket_price: number;
  ticket_quantity: number;
  tickets_sold: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string;
  quantity: number;
  total_price: number;
  status: string;
  buyer_name: string | null;
  buyer_email: string;
  created_at: string;
}
