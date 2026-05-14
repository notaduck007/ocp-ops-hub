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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          granted_at: string | null
          id: string
          is_admin: boolean
          last_reviewed_at: string | null
          last_used_at: string | null
          notes: string | null
          person_id: string
          role_level: Database["public"]["Enums"]["access_role_level"]
          source: string | null
          system_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          granted_at?: string | null
          id?: string
          is_admin?: boolean
          last_reviewed_at?: string | null
          last_used_at?: string | null
          notes?: string | null
          person_id: string
          role_level: Database["public"]["Enums"]["access_role_level"]
          source?: string | null
          system_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          granted_at?: string | null
          id?: string
          is_admin?: boolean
          last_reviewed_at?: string | null
          last_used_at?: string | null
          notes?: string | null
          person_id?: string
          role_level?: Database["public"]["Enums"]["access_role_level"]
          source?: string | null
          system_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          email: string | null
          employer: string | null
          employment_end: string | null
          employment_start: string | null
          full_name: string
          id: string
          last_access_review_at: string | null
          linked_user_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["person_status"]
          type: Database["public"]["Enums"]["person_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          employer?: string | null
          employment_end?: string | null
          employment_start?: string | null
          full_name: string
          id?: string
          last_access_review_at?: string | null
          linked_user_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["person_status"]
          type: Database["public"]["Enums"]["person_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          employer?: string | null
          employment_end?: string | null
          employment_start?: string | null
          full_name?: string
          id?: string
          last_access_review_at?: string | null
          linked_user_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["person_status"]
          type?: Database["public"]["Enums"]["person_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      systems: {
        Row: {
          archived_at: string | null
          business_owner_id: string | null
          category: Database["public"]["Enums"]["system_category"]
          created_at: string
          created_by: string | null
          criticality: Database["public"]["Enums"]["criticality"]
          data_classes: Database["public"]["Enums"]["data_class"][]
          description: string | null
          id: string
          mfa_required: boolean
          name: string
          notes: string | null
          rpo_minutes: number | null
          rto_minutes: number | null
          technical_owner_id: string | null
          updated_at: string
          updated_by: string | null
          url: string | null
          vendor_id: string | null
        }
        Insert: {
          archived_at?: string | null
          business_owner_id?: string | null
          category: Database["public"]["Enums"]["system_category"]
          created_at?: string
          created_by?: string | null
          criticality?: Database["public"]["Enums"]["criticality"]
          data_classes?: Database["public"]["Enums"]["data_class"][]
          description?: string | null
          id?: string
          mfa_required?: boolean
          name: string
          notes?: string | null
          rpo_minutes?: number | null
          rto_minutes?: number | null
          technical_owner_id?: string | null
          updated_at?: string
          updated_by?: string | null
          url?: string | null
          vendor_id?: string | null
        }
        Update: {
          archived_at?: string | null
          business_owner_id?: string | null
          category?: Database["public"]["Enums"]["system_category"]
          created_at?: string
          created_by?: string | null
          criticality?: Database["public"]["Enums"]["criticality"]
          data_classes?: Database["public"]["Enums"]["data_class"][]
          description?: string | null
          id?: string
          mfa_required?: boolean
          name?: string
          notes?: string | null
          rpo_minutes?: number | null
          rto_minutes?: number | null
          technical_owner_id?: string | null
          updated_at?: string
          updated_by?: string | null
          url?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "systems_business_owner_id_fkey"
            columns: ["business_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "systems_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "systems_technical_owner_id_fkey"
            columns: ["technical_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "systems_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_mfa_coverage: {
        Row: {
          covered_count: number | null
          eligible_count: number | null
          mfa_coverage_pct: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_editor: { Args: never; Returns: boolean }
      is_viewer: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _entity_id: string
          _entity_type: string
        }
        Returns: string
      }
    }
    Enums: {
      access_role_level: "read" | "write" | "admin" | "owner"
      app_role: "admin" | "editor" | "viewer"
      criticality: "low" | "medium" | "high" | "critical"
      data_class:
        | "none"
        | "member_pii"
        | "staff_pii"
        | "financial"
        | "unpublished_spec"
        | "public"
      person_status: "active" | "inactive" | "offboarded"
      person_type: "staff" | "contractor" | "vendor_user" | "service_account"
      system_category:
        | "idp"
        | "github"
        | "crm"
        | "cms"
        | "storage"
        | "finance"
        | "event"
        | "security"
        | "collab"
        | "other"
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
      access_role_level: ["read", "write", "admin", "owner"],
      app_role: ["admin", "editor", "viewer"],
      criticality: ["low", "medium", "high", "critical"],
      data_class: [
        "none",
        "member_pii",
        "staff_pii",
        "financial",
        "unpublished_spec",
        "public",
      ],
      person_status: ["active", "inactive", "offboarded"],
      person_type: ["staff", "contractor", "vendor_user", "service_account"],
      system_category: [
        "idp",
        "github",
        "crm",
        "cms",
        "storage",
        "finance",
        "event",
        "security",
        "collab",
        "other",
      ],
    },
  },
} as const
