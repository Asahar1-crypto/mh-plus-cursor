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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_members: {
        Row: {
          account_id: string
          created_at: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["account_member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["account_member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["account_member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          invitation_id: string | null
          name: string
          owner_id: string
          shared_with_email: string | null
          shared_with_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_id?: string | null
          name: string
          owner_id: string
          shared_with_email?: string | null
          shared_with_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_id?: string | null
          name?: string
          owner_id?: string
          shared_with_email?: string | null
          shared_with_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_shared_with_id_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          account_id: string
          category: string
          created_at: string
          id: string
          month: number
          monthly_amount: number
          updated_at: string
          year: number
        }
        Insert: {
          account_id: string
          category: string
          created_at?: string
          id?: string
          month: number
          monthly_amount: number
          updated_at?: string
          year: number
        }
        Update: {
          account_id?: string
          category?: string
          created_at?: string
          id?: string
          month?: number
          monthly_amount?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_budgets_account"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          account_id: string
          birth_date: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          birth_date?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          birth_date?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_users: {
        Row: {
          accounts_deleted: string[] | null
          created_at: string
          deleted_at: string
          deleted_by: string
          email: string
          id: string
          name: string | null
          original_user_id: string
        }
        Insert: {
          accounts_deleted?: string[] | null
          created_at?: string
          deleted_at?: string
          deleted_by: string
          email: string
          id?: string
          name?: string | null
          original_user_id: string
        }
        Update: {
          accounts_deleted?: string[] | null
          created_at?: string
          deleted_at?: string
          deleted_by?: string
          email?: string
          id?: string
          name?: string | null
          original_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deleted_users_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_change_logs: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          id: string
          new_email: string | null
          old_email: string | null
          requested_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          new_email?: string | null
          old_email?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          new_email?: string | null
          old_email?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      expense_children: {
        Row: {
          child_id: string
          expense_id: string
        }
        Insert: {
          child_id: string
          expense_id: string
        }
        Update: {
          child_id?: string
          expense_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_children_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_children_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string | null
          created_at: string
          created_by_id: string | null
          date: string
          description: string
          end_date: string | null
          frequency: string | null
          has_end_date: boolean | null
          id: string
          is_recurring: boolean | null
          paid_by_id: string
          receipt_url: string | null
          recurring_parent_id: string | null
          split_equally: boolean
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string
          created_by_id?: string | null
          date?: string
          description: string
          end_date?: string | null
          frequency?: string | null
          has_end_date?: boolean | null
          id?: string
          is_recurring?: boolean | null
          paid_by_id: string
          receipt_url?: string | null
          recurring_parent_id?: string | null
          split_equally?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string
          created_by_id?: string | null
          date?: string
          description?: string
          end_date?: string | null
          frequency?: string | null
          has_end_date?: boolean | null
          id?: string
          is_recurring?: boolean | null
          paid_by_id?: string
          receipt_url?: string | null
          recurring_parent_id?: string | null
          split_equally?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_id_fkey"
            columns: ["paid_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recurring_parent_id_fkey"
            columns: ["recurring_parent_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          account_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_id: string
        }
        Insert: {
          accepted_at?: string | null
          account_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_id: string
        }
        Update: {
          accepted_at?: string | null
          account_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_super_admin: boolean | null
          last_login: string | null
          name: string
          phone_e164: string | null
          phone_extension: string | null
          phone_number: string | null
          phone_type: string | null
          phone_verified: boolean | null
          raw_phone_input: string | null
          selected_account_id: string | null
          two_factor_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_super_admin?: boolean | null
          last_login?: string | null
          name: string
          phone_e164?: string | null
          phone_extension?: string | null
          phone_number?: string | null
          phone_type?: string | null
          phone_verified?: boolean | null
          raw_phone_input?: string | null
          selected_account_id?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_super_admin?: boolean | null
          last_login?: string | null
          name?: string
          phone_e164?: string | null
          phone_extension?: string | null
          phone_number?: string | null
          phone_type?: string | null
          phone_verified?: boolean | null
          raw_phone_input?: string | null
          selected_account_id?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      scanned_receipts: {
        Row: {
          account_id: string
          confidence_score: number | null
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          gpt_response: Json | null
          id: string
          processed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          confidence_score?: number | null
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          gpt_response?: Json | null
          id?: string
          processed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          confidence_score?: number | null
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          gpt_response?: Json | null
          id?: string
          processed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          phone_number: string
          user_id: string | null
          verification_type: string | null
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_number: string
          user_id?: string | null
          verification_type?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_number?: string
          user_id?: string | null
          verification_type?: string | null
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_starts_at: string | null
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_starts_at?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_starts_at?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation_and_add_member: {
        Args: { invitation_uuid: string; user_uuid: string }
        Returns: boolean
      }
      add_account_member: {
        Args: {
          account_uuid: string
          member_role?: Database["public"]["Enums"]["account_member_role"]
          user_uuid: string
        }
        Returns: boolean
      }
      create_account_if_not_exists: {
        Args: { account_name: string; user_id: string }
        Returns: {
          id: string
          name: string
          owner_id: string
        }[]
      }
      create_account_with_admin: {
        Args: { account_name: string; admin_user_id: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      generate_recurring_expenses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_account_invitations: {
        Args: { account_uuid: string }
        Returns: {
          accepted_at: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_id: string
        }[]
      }
      get_account_members_with_details: {
        Args: { account_uuid: string }
        Returns: {
          joined_at: string
          role: Database["public"]["Enums"]["account_member_role"]
          user_id: string
          user_name: string
        }[]
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_invitation_by_id_secure: {
        Args: { invitation_uuid: string }
        Returns: {
          accepted_at: string
          account_id: string
          email: string
          expires_at: string
          id: string
        }[]
      }
      get_orphaned_verified_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          has_profile: boolean
          id: string
          last_sign_in_at: string
          profile_name: string
          raw_user_meta_data: Json
        }[]
      }
      get_system_setting: {
        Args: { key_name: string }
        Returns: string
      }
      get_unverified_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
          raw_user_meta_data: Json
        }[]
      }
      get_user_account_ids: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      has_active_subscription: {
        Args: { account_uuid: string }
        Returns: boolean
      }
      is_account_admin: {
        Args: { account_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_account_member: {
        Args: { account_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_valid_email_confirmation_url: {
        Args: { url: string }
        Returns: boolean
      }
      log_email_change_request: {
        Args: { p_new_email: string; p_old_email: string; p_user_id: string }
        Returns: string
      }
      normalize_il_phone: {
        Args: { phone_text: string }
        Returns: string
      }
      remove_account_member: {
        Args: { account_uuid: string; user_uuid: string }
        Returns: boolean
      }
      update_expired_trials: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      upsert_subscription_secure: {
        Args: {
          p_canceled_at?: string
          p_current_period_end?: string
          p_current_period_start?: string
          p_status: string
          p_stripe_customer_id: string
          p_stripe_subscription_id: string
          p_subscription_starts_at?: string
          p_tenant_id: string
          p_trial_ends_at?: string
        }
        Returns: string
      }
      validate_invitation_access: {
        Args: { invitation_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      account_member_role: "admin" | "member"
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
      account_member_role: ["admin", "member"],
    },
  },
} as const
