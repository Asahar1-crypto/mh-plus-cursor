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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_activity_logs: {
        Row: {
          account_id: string
          action: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          account_id: string
          action: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          account_id?: string
          action?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_activity_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          avatar_set: string | null
          billing_cycle_end_day: number | null
          billing_cycle_start_day: number | null
          billing_cycle_type: string | null
          billing_period: string | null
          created_at: string
          id: string
          index_linking_enabled: boolean | null
          invitation_id: string | null
          last_grade_advance_year: number | null
          monthly_budget: number | null
          name: string
          owner_id: string
          plan_slug: string | null
          shared_with_email: string | null
          shared_with_id: string | null
          sms_notifications_enabled: boolean | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
          virtual_partner_id: string | null
          virtual_partner_name: string | null
        }
        Insert: {
          avatar_set?: string | null
          billing_cycle_end_day?: number | null
          billing_cycle_start_day?: number | null
          billing_cycle_type?: string | null
          billing_period?: string | null
          created_at?: string
          id?: string
          index_linking_enabled?: boolean | null
          invitation_id?: string | null
          last_grade_advance_year?: number | null
          monthly_budget?: number | null
          name: string
          owner_id: string
          plan_slug?: string | null
          shared_with_email?: string | null
          shared_with_id?: string | null
          sms_notifications_enabled?: boolean | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          virtual_partner_id?: string | null
          virtual_partner_name?: string | null
        }
        Update: {
          avatar_set?: string | null
          billing_cycle_end_day?: number | null
          billing_cycle_start_day?: number | null
          billing_cycle_type?: string | null
          billing_period?: string | null
          created_at?: string
          id?: string
          index_linking_enabled?: boolean | null
          invitation_id?: string | null
          last_grade_advance_year?: number | null
          monthly_budget?: number | null
          name?: string
          owner_id?: string
          plan_slug?: string | null
          shared_with_email?: string | null
          shared_with_id?: string | null
          sms_notifications_enabled?: boolean | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          virtual_partner_id?: string | null
          virtual_partner_name?: string | null
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      birthday_projects: {
        Row: {
          account_id: string
          birthday_date: string
          budget_confirmed_a: boolean
          budget_confirmed_b: boolean
          budget_locked_at: string | null
          child_age_at_event: number | null
          child_id: string | null
          child_name: string
          created_at: string
          id: string
          initiated_by: string | null
          settled_at: string | null
          split_ratio_a: number | null
          status: string
          total_budget: number | null
          total_spent: number | null
          transfer_amount: number | null
          transfer_payer_id: string | null
          trigger_notification_sent: boolean
          updated_at: string
        }
        Insert: {
          account_id: string
          birthday_date: string
          budget_confirmed_a?: boolean
          budget_confirmed_b?: boolean
          budget_locked_at?: string | null
          child_age_at_event?: number | null
          child_id?: string | null
          child_name: string
          created_at?: string
          id?: string
          initiated_by?: string | null
          settled_at?: string | null
          split_ratio_a?: number | null
          status?: string
          total_budget?: number | null
          total_spent?: number | null
          transfer_amount?: number | null
          transfer_payer_id?: string | null
          trigger_notification_sent?: boolean
          updated_at?: string
        }
        Update: {
          account_id?: string
          birthday_date?: string
          budget_confirmed_a?: boolean
          budget_confirmed_b?: boolean
          budget_locked_at?: string | null
          child_age_at_event?: number | null
          child_id?: string | null
          child_name?: string
          created_at?: string
          id?: string
          initiated_by?: string | null
          settled_at?: string | null
          split_ratio_a?: number | null
          status?: string
          total_budget?: number | null
          total_spent?: number | null
          transfer_amount?: number | null
          transfer_payer_id?: string | null
          trigger_notification_sent?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_projects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_projects_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_task_templates: {
        Row: {
          age_max: number
          age_min: number
          category: string
          description: string | null
          estimated_max: number | null
          estimated_min: number | null
          id: string
          is_must: boolean
          sort_order: number
          title: string
        }
        Insert: {
          age_max?: number
          age_min?: number
          category?: string
          description?: string | null
          estimated_max?: number | null
          estimated_min?: number | null
          id?: string
          is_must?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          age_max?: number
          age_min?: number
          category?: string
          description?: string | null
          estimated_max?: number | null
          estimated_min?: number | null
          id?: string
          is_must?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      birthday_tasks: {
        Row: {
          account_id: string
          actual_amount: number | null
          category: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_amount: number | null
          id: string
          is_suggested: boolean
          paid_at: string | null
          paid_by: string | null
          project_id: string
          receipt_url: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_id: string
          actual_amount?: number | null
          category?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_amount?: number | null
          id?: string
          is_suggested?: boolean
          paid_at?: string | null
          paid_by?: string | null
          project_id: string
          receipt_url?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_id?: string
          actual_amount?: number | null
          category?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_amount?: number | null
          id?: string
          is_suggested?: boolean
          paid_at?: string | null
          paid_by?: string | null
          project_id?: string
          receipt_url?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "birthday_tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "birthday_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_triggers_log: {
        Row: {
          account_id: string
          birthday_year: number
          child_id: string
          id: string
          project_id: string | null
          triggered_at: string
        }
        Insert: {
          account_id: string
          birthday_year: number
          child_id: string
          id?: string
          project_id?: string | null
          triggered_at?: string
        }
        Update: {
          account_id?: string
          birthday_year?: number
          child_id?: string
          id?: string
          project_id?: string | null
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_triggers_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_triggers_log_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_triggers_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "birthday_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          account_id: string
          budget_type: string | null
          categories: string[] | null
          category: string | null
          created_at: string
          end_date: string | null
          id: string
          month: number | null
          monthly_amount: number
          start_date: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          account_id: string
          budget_type?: string | null
          categories?: string[] | null
          category?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          month?: number | null
          monthly_amount: number
          start_date?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          account_id?: string
          budget_type?: string | null
          categories?: string[] | null
          category?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          month?: number | null
          monthly_amount?: number
          start_date?: string | null
          updated_at?: string
          year?: number | null
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
      categories: {
        Row: {
          account_id: string
          color: string | null
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          account_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          account_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_account_id_fkey"
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
          budget_limit: number | null
          created_at: string
          current_grade: number | null
          education_auto: boolean
          education_level: string | null
          gender: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          birth_date?: string | null
          budget_limit?: number | null
          created_at?: string
          current_grade?: number | null
          education_auto?: boolean
          education_level?: string | null
          gender?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          birth_date?: string | null
          budget_limit?: number | null
          created_at?: string
          current_grade?: number | null
          education_auto?: boolean
          education_level?: string | null
          gender?: string | null
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
      coupon_redemptions: {
        Row: {
          account_id: string
          billing_period: string
          coupon_id: string
          created_at: string
          discount_applied: number
          id: string
          plan_slug: string
          redeemed_by: string
        }
        Insert: {
          account_id: string
          billing_period: string
          coupon_id: string
          created_at?: string
          discount_applied: number
          id?: string
          plan_slug: string
          redeemed_by: string
        }
        Update: {
          account_id?: string
          billing_period?: string
          coupon_id?: string
          created_at?: string
          discount_applied?: number
          id?: string
          plan_slug?: string
          redeemed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_billing: string
          applicable_plans: string
          code: string
          created_at: string
          created_by: string | null
          current_redemptions: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_redemptions: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_billing?: string
          applicable_plans?: string
          code: string
          created_at?: string
          created_by?: string | null
          current_redemptions?: number
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_billing?: string
          applicable_plans?: string
          code?: string
          created_at?: string
          created_by?: string | null
          current_redemptions?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      cpi_history: {
        Row: {
          fetched_at: string | null
          index_value: number
          period: string
        }
        Insert: {
          fetched_at?: string | null
          index_value: number
          period: string
        }
        Update: {
          fetched_at?: string | null
          index_value?: number
          period?: string
        }
        Relationships: []
      }
      custody_agreements: {
        Row: {
          account_id: string
          confirmed_by: string[]
          created_at: string
          id: string
          last_proposal_at: string | null
          last_proposal_by: string | null
          last_proposal_payload: Json | null
          updated_at: string
          version: number
        }
        Insert: {
          account_id: string
          confirmed_by?: string[]
          created_at?: string
          id?: string
          last_proposal_at?: string | null
          last_proposal_by?: string | null
          last_proposal_payload?: Json | null
          updated_at?: string
          version?: number
        }
        Update: {
          account_id?: string
          confirmed_by?: string[]
          created_at?: string
          id?: string
          last_proposal_at?: string | null
          last_proposal_by?: string | null
          last_proposal_payload?: Json | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "custody_agreements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_agreements_last_proposal_by_fkey"
            columns: ["last_proposal_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_audit: {
        Row: {
          account_id: string
          action: string
          actor_id: string | null
          created_at: string
          diff: Json
          event_date: string | null
          id: number
          target: string
          target_id: string
        }
        Insert: {
          account_id: string
          action: string
          actor_id?: string | null
          created_at?: string
          diff: Json
          event_date?: string | null
          id?: number
          target: string
          target_id: string
        }
        Update: {
          account_id?: string
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json
          event_date?: string | null
          id?: number
          target?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custody_audit_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_audit_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_exceptions: {
        Row: {
          account_id: string
          claimed_by: string | null
          created_at: string
          created_by: string
          education_level: string | null
          end_date: string
          end_time: string | null
          event_name: string | null
          id: string
          kind: string
          notes: string | null
          parent_event: string | null
          source_event_id: string | null
          start_date: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          claimed_by?: string | null
          created_at?: string
          created_by: string
          education_level?: string | null
          end_date: string
          end_time?: string | null
          event_name?: string | null
          id?: string
          kind: string
          notes?: string | null
          parent_event?: string | null
          source_event_id?: string | null
          start_date: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          claimed_by?: string | null
          created_at?: string
          created_by?: string
          education_level?: string | null
          end_date?: string
          end_time?: string | null
          event_name?: string | null
          id?: string
          kind?: string
          notes?: string | null
          parent_event?: string | null
          source_event_id?: string | null
          start_date?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custody_exceptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_exceptions_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_exceptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_patterns: {
        Row: {
          account_id: string
          acts_as: string | null
          created_at: string
          dtstart: string
          handoff_time: string
          id: string
          label: string | null
          owner_user_id: string
          preset_key: string
          until_date: string | null
          updated_at: string
          weekday_mask_week1: number
          weekday_mask_week2: number | null
          weekend_handoff_time: string | null
        }
        Insert: {
          account_id: string
          acts_as?: string | null
          created_at?: string
          dtstart: string
          handoff_time?: string
          id?: string
          label?: string | null
          owner_user_id: string
          preset_key: string
          until_date?: string | null
          updated_at?: string
          weekday_mask_week1: number
          weekday_mask_week2?: number | null
          weekend_handoff_time?: string | null
        }
        Update: {
          account_id?: string
          acts_as?: string | null
          created_at?: string
          dtstart?: string
          handoff_time?: string
          id?: string
          label?: string | null
          owner_user_id?: string
          preset_key?: string
          until_date?: string | null
          updated_at?: string
          weekday_mask_week1?: number
          weekday_mask_week2?: number | null
          weekend_handoff_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_patterns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_patterns_acts_as_fkey"
            columns: ["acts_as"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_patterns_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_proposals: {
        Row: {
          account_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          expires_at: string
          id: string
          kind: string
          note: string | null
          payload: Json
          proposer_id: string
          recipient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          expires_at?: string
          id?: string
          kind: string
          note?: string | null
          payload: Json
          proposer_id: string
          recipient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          expires_at?: string
          id?: string
          kind?: string
          note?: string | null
          payload?: Json
          proposer_id?: string
          recipient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custody_proposals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_proposals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_proposals_proposer_id_fkey"
            columns: ["proposer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_proposals_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      device_tokens: {
        Row: {
          account_id: string | null
          created_at: string | null
          device_info: Json | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
      email_change_requests: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          new_email: string
          old_email: string
          status: string | null
          token: string | null
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          new_email: string
          old_email: string
          status?: string | null
          token?: string | null
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          new_email?: string
          old_email?: string
          status?: string | null
          token?: string | null
          user_id?: string
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
      expense_notifications: {
        Row: {
          created_at: string
          error_message: string | null
          expense_id: string
          id: string
          notification_type: string
          recipient_phone: string | null
          recipient_user_id: string | null
          sent_at: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          expense_id: string
          id?: string
          notification_type?: string
          recipient_phone?: string | null
          recipient_user_id?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          expense_id?: string
          id?: string
          notification_type?: string
          recipient_phone?: string | null
          recipient_user_id?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_notifications_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          base_amount: number | null
          base_index_period: string | null
          category: string | null
          created_at: string
          created_by_id: string | null
          date: string
          description: string
          edited_by_id: string | null
          end_date: string | null
          floor_enabled: boolean | null
          frequency: string | null
          has_end_date: boolean | null
          id: string
          index_update_frequency: string | null
          invoice_number: string | null
          is_index_linked: boolean | null
          is_recurring: boolean | null
          last_calculated_amount: number | null
          paid_by_id: string
          pending_changes: Json | null
          receipt_id: string | null
          receipt_url: string | null
          recurring_active: boolean | null
          recurring_approved_by: string | null
          recurring_auto_approved: boolean | null
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
          base_amount?: number | null
          base_index_period?: string | null
          category?: string | null
          created_at?: string
          created_by_id?: string | null
          date?: string
          description: string
          edited_by_id?: string | null
          end_date?: string | null
          floor_enabled?: boolean | null
          frequency?: string | null
          has_end_date?: boolean | null
          id?: string
          index_update_frequency?: string | null
          invoice_number?: string | null
          is_index_linked?: boolean | null
          is_recurring?: boolean | null
          last_calculated_amount?: number | null
          paid_by_id: string
          pending_changes?: Json | null
          receipt_id?: string | null
          receipt_url?: string | null
          recurring_active?: boolean | null
          recurring_approved_by?: string | null
          recurring_auto_approved?: boolean | null
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
          base_amount?: number | null
          base_index_period?: string | null
          category?: string | null
          created_at?: string
          created_by_id?: string | null
          date?: string
          description?: string
          edited_by_id?: string | null
          end_date?: string | null
          floor_enabled?: boolean | null
          frequency?: string | null
          has_end_date?: boolean | null
          id?: string
          index_update_frequency?: string | null
          invoice_number?: string | null
          is_index_linked?: boolean | null
          is_recurring?: boolean | null
          last_calculated_amount?: number | null
          paid_by_id?: string
          pending_changes?: Json | null
          receipt_id?: string | null
          receipt_url?: string | null
          recurring_active?: boolean | null
          recurring_approved_by?: string | null
          recurring_auto_approved?: boolean | null
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
            foreignKeyName: "expenses_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "scanned_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recurring_approved_by_fkey"
            columns: ["recurring_approved_by"]
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
          email: string | null
          expires_at: string
          id: string
          invitation_id: string
          phone_number: string | null
        }
        Insert: {
          accepted_at?: string | null
          account_id: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invitation_id: string
          phone_number?: string | null
        }
        Update: {
          accepted_at?: string | null
          account_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invitation_id?: string
          phone_number?: string | null
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
      notification_logs: {
        Row: {
          account_id: string | null
          body: string | null
          channel: string
          clicked_at: string | null
          created_at: string | null
          data: Json | null
          delivered_at: string | null
          device_token_id: string | null
          error_message: string | null
          fcm_message_id: string | null
          id: string
          notification_type: string
          platform: string | null
          sent_at: string | null
          status: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          body?: string | null
          channel: string
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          device_token_id?: string | null
          error_message?: string | null
          fcm_message_id?: string | null
          id?: string
          notification_type: string
          platform?: string | null
          sent_at?: string | null
          status: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          body?: string | null
          channel?: string
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          device_token_id?: string | null
          error_message?: string | null
          fcm_message_id?: string | null
          id?: string
          notification_type?: string
          platform?: string | null
          sent_at?: string | null
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          account_id: string | null
          created_at: string | null
          email_enabled: boolean | null
          id: string
          preferences: Json | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          preferences?: Json | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          preferences?: Json | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_attempts: {
        Row: {
          attempted_at: string
          created_at: string
          email: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          created_at?: string
          email: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          max_members: number
          monthly_price: number
          name: string
          slug: string
          sort_order: number
          updated_at: string
          yearly_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_members?: number
          monthly_price: number
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          yearly_price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          max_members?: number
          monthly_price?: number
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email_verified: boolean
          family_role: string | null
          id: string
          is_super_admin: boolean | null
          last_login: string | null
          name: string
          onboarding_completed: boolean | null
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
          email_verified?: boolean
          family_role?: string | null
          id: string
          is_super_admin?: boolean | null
          last_login?: string | null
          name: string
          onboarding_completed?: boolean | null
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
          email_verified?: boolean
          family_role?: string | null
          id?: string
          is_super_admin?: boolean | null
          last_login?: string | null
          name?: string
          onboarding_completed?: boolean | null
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
          invoice_number: string | null
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
          invoice_number?: string | null
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
          invoice_number?: string | null
          processed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_calendar_events: {
        Row: {
          applies_to: string[]
          created_at: string
          end_date: string
          event_key: string
          id: string
          kind: string
          name_he: string
          parent_event_key: string | null
          school_year: string
          source: string
          source_ref: string | null
          start_date: string
          stream: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          applies_to: string[]
          created_at?: string
          end_date: string
          event_key: string
          id?: string
          kind: string
          name_he: string
          parent_event_key?: string | null
          school_year: string
          source: string
          source_ref?: string | null
          start_date: string
          stream?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          applies_to?: string[]
          created_at?: string
          end_date?: string
          event_key?: string
          id?: string
          kind?: string
          name_he?: string
          parent_event_key?: string | null
          school_year?: string
          source?: string
          source_ref?: string | null
          start_date?: string
          stream?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_calendar_events_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_locks: {
        Row: {
          account_id: string
          id: string
          locked_at: string
          locked_by: string | null
          month: number
          year: number
        }
        Insert: {
          account_id: string
          id?: string
          locked_at?: string
          locked_by?: string | null
          month: number
          year: number
        }
        Update: {
          account_id?: string
          id?: string
          locked_at?: string
          locked_by?: string | null
          month?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlement_locks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_payments: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          created_by: string
          from_user_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          to_user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          created_by: string
          from_user_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          to_user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          created_by?: string
          from_user_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_payments_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_payments_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
          activated_by: string | null
          amount_paid: number | null
          billing_period: string | null
          canceled_at: string | null
          coupon_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_provider: string | null
          plan_id: string | null
          plan_slug: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_starts_at: string | null
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          activated_by?: string | null
          amount_paid?: number | null
          billing_period?: string | null
          canceled_at?: string | null
          coupon_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_provider?: string | null
          plan_id?: string | null
          plan_slug?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_starts_at?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          activated_by?: string | null
          amount_paid?: number | null
          billing_period?: string | null
          canceled_at?: string | null
          coupon_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_provider?: string | null
          plan_id?: string | null
          plan_slug?: string | null
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
            foreignKeyName: "subscriptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      system_errors: {
        Row: {
          account_id: string | null
          created_at: string
          error_category: string
          error_code: string | null
          function_name: string
          http_status: number | null
          id: string
          raw_details: Json
          request_metadata: Json | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          user_id: string | null
          user_message: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          error_category: string
          error_code?: string | null
          function_name: string
          http_status?: number | null
          id?: string
          raw_details?: Json
          request_metadata?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
          user_message: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          error_category?: string
          error_code?: string | null
          function_name?: string
          http_status?: number | null
          id?: string
          raw_details?: Json
          request_metadata?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_errors_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_errors_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      custody_assignments: {
        Row: {
          account_id: string | null
          assigned_parent_id: string | null
          created_at: string | null
          created_by: string | null
          education_level: string | null
          end_date: string | null
          event_name: string | null
          event_type: string | null
          id: string | null
          notes: string | null
          parent_event: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          assigned_parent_id?: string | null
          created_at?: string | null
          created_by?: string | null
          education_level?: string | null
          end_date?: string | null
          event_name?: string | null
          event_type?: string | null
          id?: string | null
          notes?: string | null
          parent_event?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          assigned_parent_id?: string | null
          created_at?: string | null
          created_by?: string | null
          education_level?: string | null
          end_date?: string | null
          event_name?: string | null
          event_type?: string | null
          id?: string | null
          notes?: string | null
          parent_event?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_exceptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_exceptions_claimed_by_fkey"
            columns: ["assigned_parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_exceptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      advance_children_grades: {
        Args: { p_target_year?: number }
        Returns: number
      }
      can_add_member: { Args: { p_account_id: string }; Returns: boolean }
      check_reset_attempt_limit: {
        Args: { user_email: string }
        Returns: boolean
      }
      claim_birthday_task: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: undefined
      }
      cleanup_inactive_tokens: { Args: never; Returns: undefined }
      cleanup_old_reset_attempts: { Args: never; Returns: undefined }
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
      education_level_for_grade: { Args: { p_grade: number }; Returns: string }
      generate_recurring_expenses: {
        Args: { p_month?: number; p_year?: number }
        Returns: {
          errors: number
          generated: number
          skipped: number
        }[]
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
      get_account_member_profile: {
        Args: { member_user_id: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      get_account_members_basic_info: {
        Args: { account_uuid: string }
        Returns: {
          id: string
          name: string
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
      get_current_user_email: { Args: never; Returns: string }
      get_current_user_phone: { Args: never; Returns: string }
      get_email_change_status: {
        Args: { p_user_id: string }
        Returns: {
          confirmed_at: string
          created_at: string
          id: string
          new_email: string
          old_email: string
          status: string
        }[]
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
        Args: never
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
      get_plan_max_members: { Args: { p_plan_slug: string }; Returns: number }
      get_public_invitation_details: {
        Args: { p_invitation_id: string }
        Returns: {
          accepted_at: string
          account_id: string
          account_name: string
          email: string
          expires_at: string
          owner_name: string
          phone_number: string
        }[]
      }
      get_system_setting: { Args: { key_name: string }; Returns: string }
      get_unverified_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
          raw_user_meta_data: Json
        }[]
      }
      get_user_account_ids: { Args: { user_uuid: string }; Returns: string[] }
      get_virtual_partner_for_account: {
        Args: { p_account_id: string }
        Returns: {
          role: string
          user_id: string
          user_name: string
        }[]
      }
      has_active_subscription: {
        Args: { account_uuid: string }
        Returns: boolean
      }
      increment_otp_attempts: { Args: { p_id: string }; Returns: number }
      is_account_admin: {
        Args: { account_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_account_member: {
        Args: { account_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_super_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_valid_email_confirmation_url: {
        Args: { url: string }
        Returns: boolean
      }
      log_email_change_request: {
        Args: { p_new_email: string; p_old_email: string; p_user_id: string }
        Returns: string
      }
      log_reset_attempt: {
        Args: {
          client_ip?: unknown
          client_user_agent?: string
          user_email: string
        }
        Returns: undefined
      }
      mark_notification_clicked: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      normalize_il_phone: { Args: { phone_text: string }; Returns: string }
      promote_virtual_partner: {
        Args: { p_account_id: string; p_real_user_id: string }
        Returns: Json
      }
      remove_account_member: {
        Args: { account_uuid: string; user_uuid: string }
        Returns: boolean
      }
      update_expired_trials: { Args: never; Returns: undefined }
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
      validate_coupon: {
        Args: {
          p_account_id: string
          p_billing_period: string
          p_code: string
          p_plan_slug: string
        }
        Returns: {
          coupon_id: string
          discount_type: string
          discount_value: number
          error_message: string
          is_valid: boolean
        }[]
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
<claude-code-hint v="1" type="plugin" value="supabase@claude-plugins-official" />
