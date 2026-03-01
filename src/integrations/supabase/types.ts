export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      album_photos: {
        Row: {
          album_id: string
          created_at: string
          id: string
          image_url: string
          sort_order: number
          title: string | null
        }
        Insert: {
          album_id: string
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
          title?: string | null
        }
        Update: {
          album_id?: string
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "album_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          areas: string | null
          created_at: string
          date: string
          description: string | null
          genre: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          ticket_price: number | null
          ticket_quantity: number | null
          tickets_sold: number | null
          time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          areas?: string | null
          created_at?: string
          date: string
          description?: string | null
          genre?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          ticket_price?: number | null
          ticket_quantity?: number | null
          tickets_sold?: number | null
          time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          areas?: string | null
          created_at?: string
          date?: string
          description?: string | null
          genre?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          ticket_price?: number | null
          ticket_quantity?: number | null
          tickets_sold?: number | null
          time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          date: string
          email: string
          guest_count: number
          id: string
          lounge_type: string
          message: string | null
          name: string
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          date: string
          email: string
          guest_count?: number
          id?: string
          lounge_type: string
          message?: string | null
          name: string
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          date?: string
          email?: string
          guest_count?: number
          id?: string
          lounge_type?: string
          message?: string | null
          name?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          buyer_email: string
          buyer_name: string | null
          created_at: string
          event_id: string
          id: string
          quantity: number
          status: string
          total_price: number
          user_id: string
        }
        Insert: {
          buyer_email: string
          buyer_name?: string | null
          created_at?: string
          event_id: string
          id?: string
          quantity?: number
          status?: string
          total_price?: number
          user_id: string
        }
        Update: {
          buyer_email?: string
          buyer_name?: string | null
          created_at?: string
          event_id?: string
          id?: string
          quantity?: number
          status?: string
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      u18_forms: {
        Row: {
          accept_newsletter: boolean
          created_at: string
          email: string
          event_date: string | null
          event_id: string | null
          event_title: string
          has_signature: boolean
          id: string
          minor_address: string
          minor_birthday: string
          minor_country: string
          minor_name: string
          minor_phone: string
          parent_address: string
          parent_birthday: string
          parent_country: string
          parent_name: string
          parent_phone: string
          supervisor_address: string | null
          supervisor_birthday: string | null
          supervisor_country: string | null
          supervisor_email: string | null
          supervisor_name: string | null
          supervisor_phone: string | null
        }
        Insert: {
          accept_newsletter?: boolean
          created_at?: string
          email: string
          event_date?: string | null
          event_id?: string | null
          event_title: string
          has_signature?: boolean
          id?: string
          minor_address: string
          minor_birthday: string
          minor_country?: string
          minor_name: string
          minor_phone: string
          parent_address: string
          parent_birthday: string
          parent_country?: string
          parent_name: string
          parent_phone: string
          supervisor_address?: string | null
          supervisor_birthday?: string | null
          supervisor_country?: string | null
          supervisor_email?: string | null
          supervisor_name?: string | null
          supervisor_phone?: string | null
        }
        Update: {
          accept_newsletter?: boolean
          created_at?: string
          email?: string
          event_date?: string | null
          event_id?: string | null
          event_title?: string
          has_signature?: boolean
          id?: string
          minor_address?: string
          minor_birthday?: string
          minor_country?: string
          minor_name?: string
          minor_phone?: string
          parent_address?: string
          parent_birthday?: string
          parent_country?: string
          parent_name?: string
          parent_phone?: string
          supervisor_address?: string | null
          supervisor_birthday?: string | null
          supervisor_country?: string | null
          supervisor_email?: string | null
          supervisor_name?: string | null
          supervisor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "u18_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
