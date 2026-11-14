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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          value?: Json | null
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          anrede: string | null
          campaign_id: string
          created_at: string
          email: string
          error: string | null
          first_name: string | null
          id: string
          last_name: string | null
          sent_at: string | null
          smtp_account_used: string | null
          status: string
        }
        Insert: {
          anrede?: string | null
          campaign_id: string
          created_at?: string
          email: string
          error?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          sent_at?: string | null
          smtp_account_used?: string | null
          status?: string
        }
        Update: {
          anrede?: string | null
          campaign_id?: string
          created_at?: string
          email?: string
          error?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          sent_at?: string | null
          smtp_account_used?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_smtp_account_used_fkey"
            columns: ["smtp_account_used"]
            isOneToOne: false
            referencedRelation: "smtp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          failed: number
          finished_at: string | null
          html_content: string | null
          id: string
          last_error: string | null
          name: string
          rr_index: number
          sent: number
          smtp_account_ids: string[]
          started_at: string | null
          status: string
          subject: string | null
          total: number
        }
        Insert: {
          created_at?: string
          failed?: number
          finished_at?: string | null
          html_content?: string | null
          id?: string
          last_error?: string | null
          name: string
          rr_index?: number
          sent?: number
          smtp_account_ids?: string[]
          started_at?: string | null
          status?: string
          subject?: string | null
          total?: number
        }
        Update: {
          created_at?: string
          failed?: number
          finished_at?: string | null
          html_content?: string | null
          id?: string
          last_error?: string | null
          name?: string
          rr_index?: number
          sent?: number
          smtp_account_ids?: string[]
          started_at?: string | null
          status?: string
          subject?: string | null
          total?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          campaign_id: string | null
          created_at: string
          email: string
          error: string | null
          first_name: string | null
          id: string
          last_name: string | null
          scheduled_at: string | null
          sent_at: string | null
          smtp_account_used: string | null
          source: string | null
          status: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email: string
          error?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          smtp_account_used?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email?: string
          error?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          smtp_account_used?: string | null
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_smtp_account_used_fkey"
            columns: ["smtp_account_used"]
            isOneToOne: false
            referencedRelation: "smtp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_settings: {
        Row: {
          auto_campaign_enabled: boolean
          delay_seconds: number
          id: number
          min_gap_seconds: number
          template_key: string
        }
        Insert: {
          auto_campaign_enabled?: boolean
          delay_seconds?: number
          id?: number
          min_gap_seconds?: number
          template_key?: string
        }
        Update: {
          auto_campaign_enabled?: boolean
          delay_seconds?: number
          id?: number
          min_gap_seconds?: number
          template_key?: string
        }
        Relationships: []
      }
      mail_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          message: string
          type: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          type?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          type?: string
        }
        Relationships: []
      }
      smtp_accounts: {
        Row: {
          created_at: string
          daily_limit: number
          from_email: string | null
          from_name: string | null
          host: string
          id: string
          klick_domain: string | null
          label: string | null
          password: string | null
          port: number
          sent_date: string | null
          sent_today: number
          status: string
          user_email: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          from_email?: string | null
          from_name?: string | null
          host: string
          id?: string
          klick_domain?: string | null
          label?: string | null
          password?: string | null
          port?: number
          sent_date?: string | null
          sent_today?: number
          status?: string
          user_email: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          from_email?: string | null
          from_name?: string | null
          host?: string
          id?: string
          klick_domain?: string | null
          label?: string | null
          password?: string | null
          port?: number
          sent_date?: string | null
          sent_today?: number
          status?: string
          user_email?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      admin_exists: { Args: never; Returns: boolean }
      claim_sender_lock: { Args: { _ttl_seconds: number }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      release_sender_lock: { Args: never; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
