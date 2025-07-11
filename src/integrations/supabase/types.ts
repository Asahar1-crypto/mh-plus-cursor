export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
          has_end_date: boolean | null
          id: string
          paid_by_id: string
          receipt_url: string | null
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
          has_end_date?: boolean | null
          id?: string
          paid_by_id: string
          receipt_url?: string | null
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
          has_end_date?: boolean | null
          id?: string
          paid_by_id?: string
          receipt_url?: string | null
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
          name: string
          selected_account_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          selected_account_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          selected_account_id?: string | null
          updated_at?: string
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
          user_uuid: string
          member_role?: Database["public"]["Enums"]["account_member_role"]
        }
        Returns: boolean
      }
      create_account_if_not_exists: {
        Args: { user_id: string; account_name: string }
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
      get_account_members_with_details: {
        Args: { account_uuid: string }
        Returns: {
          user_id: string
          user_name: string
          role: Database["public"]["Enums"]["account_member_role"]
          joined_at: string
        }[]
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_account_ids: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      is_account_admin: {
        Args: { user_uuid: string; account_uuid: string }
        Returns: boolean
      }
      is_account_member: {
        Args: { user_uuid: string; account_uuid: string }
        Returns: boolean
      }
      remove_account_member: {
        Args: { account_uuid: string; user_uuid: string }
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
