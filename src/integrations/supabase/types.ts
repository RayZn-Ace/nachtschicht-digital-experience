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
      account_deletions: {
        Row: {
          deleted_at: string
          id: string
          method: string
          reason: string | null
          user_id: string
        }
        Insert: {
          deleted_at?: string
          id?: string
          method?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          deleted_at?: string
          id?: string
          method?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      discount_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          event_id: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          uses: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          event_id?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          event_id?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          uses?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tag_assignments: {
        Row: {
          event_id: string
          id: string
          tag_id: string
        }
        Insert: {
          event_id: string
          id?: string
          tag_id: string
        }
        Update: {
          event_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tag_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "event_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
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
      lounge_bookings: {
        Row: {
          agreed_terms: boolean
          arrival_time: string | null
          booking_type: string
          created_at: string
          deposit_amount: number
          deposit_paid: boolean
          event_id: string
          guest_count: number
          id: string
          lounge_id: string
          message: string | null
          notes: string | null
          status: string
          user_email: string
          user_id: string | null
          user_name: string
          user_phone: string | null
        }
        Insert: {
          agreed_terms?: boolean
          arrival_time?: string | null
          booking_type?: string
          created_at?: string
          deposit_amount?: number
          deposit_paid?: boolean
          event_id: string
          guest_count?: number
          id?: string
          lounge_id: string
          message?: string | null
          notes?: string | null
          status?: string
          user_email: string
          user_id?: string | null
          user_name: string
          user_phone?: string | null
        }
        Update: {
          agreed_terms?: boolean
          arrival_time?: string | null
          booking_type?: string
          created_at?: string
          deposit_amount?: number
          deposit_paid?: boolean
          event_id?: string
          guest_count?: number
          id?: string
          lounge_id?: string
          message?: string | null
          notes?: string | null
          status?: string
          user_email?: string
          user_id?: string | null
          user_name?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lounge_bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lounge_bookings_lounge_id_fkey"
            columns: ["lounge_id"]
            isOneToOne: false
            referencedRelation: "lounges"
            referencedColumns: ["id"]
          },
        ]
      }
      lounges: {
        Row: {
          area_id: string
          capacity: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          min_spend: number
          name: string
          price_per_person: number
          sort_order: number
        }
        Insert: {
          area_id?: string
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_spend?: number
          name: string
          price_per_person?: number
          sort_order?: number
        }
        Update: {
          area_id?: string
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_spend?: number
          name?: string
          price_per_person?: number
          sort_order?: number
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
          avatar_url: string | null
          birthday: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          gdpr_agb_consent_at: string | null
          gdpr_consent_at: string | null
          id: string
          is_deleted: boolean
          last_name: string | null
          salutation: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gdpr_agb_consent_at?: string | null
          gdpr_consent_at?: string | null
          id?: string
          is_deleted?: boolean
          last_name?: string | null
          salutation?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gdpr_agb_consent_at?: string | null
          gdpr_consent_at?: string | null
          id?: string
          is_deleted?: boolean
          last_name?: string | null
          salutation?: string | null
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
      ticket_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          name: string
          price: number
          quantity: number
          sale_end: string | null
          sale_start: string | null
          sold: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          quantity?: number
          sale_end?: string | null
          sale_start?: string | null
          sold?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          quantity?: number
          sale_end?: string | null
          sale_start?: string | null
          sold?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          buyer_email: string
          buyer_name: string | null
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          discount_code_id: string | null
          event_id: string
          id: string
          qr_code: string | null
          quantity: number
          status: string
          ticket_type_id: string | null
          total_price: number
          user_id: string | null
        }
        Insert: {
          buyer_email: string
          buyer_name?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          discount_code_id?: string | null
          event_id: string
          id?: string
          qr_code?: string | null
          quantity?: number
          status?: string
          ticket_type_id?: string | null
          total_price?: number
          user_id?: string | null
        }
        Update: {
          buyer_email?: string
          buyer_name?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          discount_code_id?: string | null
          event_id?: string
          id?: string
          qr_code?: string | null
          quantity?: number
          status?: string
          ticket_type_id?: string | null
          total_price?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_config: {
        Row: {
          consent_active: boolean
          consent_defaults: Json | null
          consent_mode_v2: boolean
          debug_mode: boolean
          ga4_active: boolean
          ga4_api_secret: string | null
          ga4_measurement_id: string | null
          google_ads_active: boolean
          google_ads_conversion_id: string | null
          google_ads_conversion_labels: Json | null
          google_enhanced_conversions: boolean
          google_server_backup: boolean
          gtm_active: boolean
          gtm_container_id: string | null
          id: string
          meta_access_token: string | null
          meta_advanced_matching: boolean
          meta_capi_active: boolean
          meta_dataset_id: string | null
          meta_pixel_active: boolean
          meta_pixel_id: string | null
          meta_test_event_code: string | null
          tiktok_access_token: string | null
          tiktok_events_api_active: boolean
          tiktok_pixel_active: boolean
          tiktok_pixel_id: string | null
          updated_at: string
        }
        Insert: {
          consent_active?: boolean
          consent_defaults?: Json | null
          consent_mode_v2?: boolean
          debug_mode?: boolean
          ga4_active?: boolean
          ga4_api_secret?: string | null
          ga4_measurement_id?: string | null
          google_ads_active?: boolean
          google_ads_conversion_id?: string | null
          google_ads_conversion_labels?: Json | null
          google_enhanced_conversions?: boolean
          google_server_backup?: boolean
          gtm_active?: boolean
          gtm_container_id?: string | null
          id?: string
          meta_access_token?: string | null
          meta_advanced_matching?: boolean
          meta_capi_active?: boolean
          meta_dataset_id?: string | null
          meta_pixel_active?: boolean
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          tiktok_access_token?: string | null
          tiktok_events_api_active?: boolean
          tiktok_pixel_active?: boolean
          tiktok_pixel_id?: string | null
          updated_at?: string
        }
        Update: {
          consent_active?: boolean
          consent_defaults?: Json | null
          consent_mode_v2?: boolean
          debug_mode?: boolean
          ga4_active?: boolean
          ga4_api_secret?: string | null
          ga4_measurement_id?: string | null
          google_ads_active?: boolean
          google_ads_conversion_id?: string | null
          google_ads_conversion_labels?: Json | null
          google_enhanced_conversions?: boolean
          google_server_backup?: boolean
          gtm_active?: boolean
          gtm_container_id?: string | null
          id?: string
          meta_access_token?: string | null
          meta_advanced_matching?: boolean
          meta_capi_active?: boolean
          meta_dataset_id?: string | null
          meta_pixel_active?: boolean
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          tiktok_access_token?: string | null
          tiktok_events_api_active?: boolean
          tiktok_pixel_active?: boolean
          tiktok_pixel_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_name: string
          id: string
          payload: Json
          platforms: Json
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_name: string
          id?: string
          payload?: Json
          platforms?: Json
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_name?: string
          id?: string
          payload?: Json
          platforms?: Json
          status?: string
          user_id?: string | null
        }
        Relationships: []
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
