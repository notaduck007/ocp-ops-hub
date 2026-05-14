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
      access_review_campaigns: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          scope_system_ids: string[]
          started_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          scope_system_ids?: string[]
          started_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          scope_system_ids?: string[]
          started_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_review_campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      access_review_items: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decision: string | null
          grant_id: string
          id: string
          notes: string | null
          reviewer_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decision?: string | null
          grant_id: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decision?: string | null
          grant_id?: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_review_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "access_review_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_review_items_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "access_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_review_items_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      change_systems: {
        Row: {
          change_id: string
          system_id: string
        }
        Insert: {
          change_id: string
          system_id: string
        }
        Update: {
          change_id?: string
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_systems_change_id_fkey"
            columns: ["change_id"]
            isOneToOne: false
            referencedRelation: "changes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_systems_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      changes: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          archived_at: string | null
          class: Database["public"]["Enums"]["change_class"]
          comms_plan: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          linked_incident_id: string | null
          requested_by: string
          risk_summary: string | null
          rollback_note: string | null
          rollback_plan: string
          rolled_back_at: string | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["change_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          archived_at?: string | null
          class: Database["public"]["Enums"]["change_class"]
          comms_plan?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          linked_incident_id?: string | null
          requested_by: string
          risk_summary?: string | null
          rollback_note?: string | null
          rollback_plan: string
          rolled_back_at?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["change_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          archived_at?: string | null
          class?: Database["public"]["Enums"]["change_class"]
          comms_plan?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          linked_incident_id?: string | null
          requested_by?: string
          risk_summary?: string | null
          rollback_note?: string | null
          rollback_plan?: string
          rolled_back_at?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["change_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "changes_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "changes_linked_incident_id_fkey"
            columns: ["linked_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "changes_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      continuity_scenarios: {
        Row: {
          archived_at: string | null
          comms_template_md: string | null
          created_at: string
          created_by: string | null
          decision_authority_user_id: string
          id: string
          impact_summary: string | null
          linked_runbook_ids: string[]
          linked_system_ids: string[]
          name: string
          trigger_summary: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          comms_template_md?: string | null
          created_at?: string
          created_by?: string | null
          decision_authority_user_id: string
          id?: string
          impact_summary?: string | null
          linked_runbook_ids?: string[]
          linked_system_ids?: string[]
          name: string
          trigger_summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          comms_template_md?: string | null
          created_at?: string
          created_by?: string | null
          decision_authority_user_id?: string
          id?: string
          impact_summary?: string | null
          linked_runbook_ids?: string[]
          linked_system_ids?: string[]
          name?: string
          trigger_summary?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "continuity_scenarios_decision_authority_user_id_fkey"
            columns: ["decision_authority_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dr_tests: {
        Row: {
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          notes_md: string | null
          performed_at: string
          performed_by_id: string
          remediation_items: string | null
          result: Database["public"]["Enums"]["dr_test_result"]
          runbook_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          notes_md?: string | null
          performed_at: string
          performed_by_id: string
          remediation_items?: string | null
          result: Database["public"]["Enums"]["dr_test_result"]
          runbook_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          notes_md?: string | null
          performed_at?: string
          performed_by_id?: string
          remediation_items?: string | null
          result?: Database["public"]["Enums"]["dr_test_result"]
          runbook_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dr_tests_performed_by_id_fkey"
            columns: ["performed_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dr_tests_runbook_id_fkey"
            columns: ["runbook_id"]
            isOneToOne: false
            referencedRelation: "runbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_comms: {
        Row: {
          audience: Database["public"]["Enums"]["comms_audience"]
          channel: string | null
          created_at: string
          created_by: string | null
          id: string
          incident_id: string
          sent_at: string
          summary: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience: Database["public"]["Enums"]["comms_audience"]
          channel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id: string
          sent_at?: string
          summary: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience?: Database["public"]["Enums"]["comms_audience"]
          channel?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id?: string
          sent_at?: string
          summary?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_comms_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_systems: {
        Row: {
          incident_id: string
          system_id: string
        }
        Insert: {
          incident_id: string
          system_id: string
        }
        Update: {
          incident_id?: string
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_systems_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_systems_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          archived_at: string | null
          closed_at: string | null
          contained_at: string | null
          created_at: string
          created_by: string | null
          declared_at: string
          declared_by: string
          id: string
          impact_summary: string | null
          next_test_due_at: string | null
          post_mortem_completed_at: string | null
          post_mortem_md: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: number
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          closed_at?: string | null
          contained_at?: string | null
          created_at?: string
          created_by?: string | null
          declared_at?: string
          declared_by: string
          id?: string
          impact_summary?: string | null
          next_test_due_at?: string | null
          post_mortem_completed_at?: string | null
          post_mortem_md?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity: number
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          closed_at?: string | null
          contained_at?: string | null
          created_at?: string
          created_by?: string | null
          declared_at?: string
          declared_by?: string
          id?: string
          impact_summary?: string | null
          next_test_due_at?: string | null
          post_mortem_completed_at?: string | null
          post_mortem_md?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_declared_by_fkey"
            columns: ["declared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      policies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          body_md: string
          created_at: string
          created_by: string | null
          id: string
          next_review_due_at: string | null
          owner_id: string
          review_cadence_days: number
          status: Database["public"]["Enums"]["policy_status"]
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          body_md: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_review_due_at?: string | null
          owner_id: string
          review_cadence_days?: number
          status?: Database["public"]["Enums"]["policy_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          body_md?: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_review_due_at?: string | null
          owner_id?: string
          review_cadence_days?: number
          status?: Database["public"]["Enums"]["policy_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policies_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body_md: string
          created_at: string
          created_by: string | null
          id: string
          policy_id: string
          status: Database["public"]["Enums"]["policy_status"]
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body_md: string
          created_at?: string
          created_by?: string | null
          id?: string
          policy_id: string
          status: Database["public"]["Enums"]["policy_status"]
          updated_at?: string
          updated_by?: string | null
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body_md?: string
          created_at?: string
          created_by?: string | null
          id?: string
          policy_id?: string
          status?: Database["public"]["Enums"]["policy_status"]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_tasks: {
        Row: {
          archived_at: string | null
          cadence_days: number
          created_at: string
          created_by: string | null
          id: string
          kind: string
          last_completed_at: string | null
          last_reminder_sent_at: string | null
          next_due_at: string
          owner_id: string
          target_id: string
          target_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          cadence_days: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          last_completed_at?: string | null
          last_reminder_sent_at?: string | null
          next_due_at: string
          owner_id: string
          target_id: string
          target_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          cadence_days?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          last_completed_at?: string | null
          last_reminder_sent_at?: string | null
          next_due_at?: string
          owner_id?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          acceptance_justification: string | null
          accepted_at: string | null
          accepted_by: string | null
          accepted_until: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["risk_kind"]
          likelihood: number
          next_review_due_at: string | null
          notes: string | null
          owner_id: string
          policy_id: string | null
          review_cadence_days: number
          score: number | null
          severity: number
          status: Database["public"]["Enums"]["risk_status"]
          system_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          vendor_id: string | null
        }
        Insert: {
          acceptance_justification?: string | null
          accepted_at?: string | null
          accepted_by?: string | null
          accepted_until?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["risk_kind"]
          likelihood: number
          next_review_due_at?: string | null
          notes?: string | null
          owner_id: string
          policy_id?: string | null
          review_cadence_days?: number
          score?: number | null
          severity: number
          status?: Database["public"]["Enums"]["risk_status"]
          system_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string | null
        }
        Update: {
          acceptance_justification?: string | null
          accepted_at?: string | null
          accepted_by?: string | null
          accepted_until?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["risk_kind"]
          likelihood?: number
          next_review_due_at?: string | null
          notes?: string | null
          owner_id?: string
          policy_id?: string | null
          review_cadence_days?: number
          score?: number | null
          severity?: number
          status?: Database["public"]["Enums"]["risk_status"]
          system_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_health"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "risks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      runbooks: {
        Row: {
          archived_at: string | null
          body_md: string
          created_at: string
          created_by: string | null
          id: string
          last_tested_at: string | null
          next_test_due_at: string | null
          owner_id: string
          scenario: Database["public"]["Enums"]["runbook_scenario"]
          system_id: string
          test_cadence_days: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          body_md?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_tested_at?: string | null
          next_test_due_at?: string | null
          owner_id: string
          scenario: Database["public"]["Enums"]["runbook_scenario"]
          system_id: string
          test_cadence_days?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          body_md?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_tested_at?: string | null
          next_test_due_at?: string | null
          owner_id?: string
          scenario?: Database["public"]["Enums"]["runbook_scenario"]
          system_id?: string
          test_cadence_days?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runbooks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runbooks_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_breaches: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          detected_at: string | null
          id: string
          impact_summary: string
          occurred_at: string
          remediation_notes: string | null
          sla_id: string
          status: Database["public"]["Enums"]["breach_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          detected_at?: string | null
          id?: string
          impact_summary: string
          occurred_at: string
          remediation_notes?: string | null
          sla_id: string
          status?: Database["public"]["Enums"]["breach_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          detected_at?: string | null
          id?: string
          impact_summary?: string
          occurred_at?: string
          remediation_notes?: string | null
          sla_id?: string
          status?: Database["public"]["Enums"]["breach_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_breaches_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "slas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_breaches_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "v_sla_review_status"
            referencedColumns: ["sla_id"]
          },
        ]
      }
      slas: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          id: string
          last_reviewed_at: string | null
          name: string
          notes: string | null
          review_cadence_days: number
          system_id: string | null
          target_type: Database["public"]["Enums"]["sla_target_type"]
          target_value: number
          updated_at: string
          updated_by: string | null
          vendor_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_reviewed_at?: string | null
          name: string
          notes?: string | null
          review_cadence_days?: number
          system_id?: string | null
          target_type: Database["public"]["Enums"]["sla_target_type"]
          target_value: number
          updated_at?: string
          updated_by?: string | null
          vendor_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_reviewed_at?: string | null
          name?: string
          notes?: string | null
          review_cadence_days?: number
          system_id?: string | null
          target_type?: Database["public"]["Enums"]["sla_target_type"]
          target_value?: number
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slas_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_health"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "slas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
          {
            foreignKeyName: "systems_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_health"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "systems_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
      vendors: {
        Row: {
          archived_at: string | null
          contract_end_at: string | null
          contract_url: string | null
          created_at: string
          created_by: string | null
          escalation_contact_email: string | null
          escalation_contact_name: string | null
          id: string
          internal_owner_id: string | null
          name: string
          notes: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          renewal_window_days: number
          status: Database["public"]["Enums"]["vendor_status"]
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          archived_at?: string | null
          contract_end_at?: string | null
          contract_url?: string | null
          created_at?: string
          created_by?: string | null
          escalation_contact_email?: string | null
          escalation_contact_name?: string | null
          id?: string
          internal_owner_id?: string | null
          name: string
          notes?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          renewal_window_days?: number
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          archived_at?: string | null
          contract_end_at?: string | null
          contract_url?: string | null
          created_at?: string
          created_by?: string | null
          escalation_contact_email?: string | null
          escalation_contact_name?: string | null
          id?: string
          internal_owner_id?: string | null
          name?: string
          notes?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          renewal_window_days?: number
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_internal_owner_id_fkey"
            columns: ["internal_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_dr_readiness: {
        Row: {
          critical_systems_tested_recently: number | null
          critical_systems_total: number | null
          pct: number | null
        }
        Relationships: []
      }
      v_incidents_this_quarter: {
        Row: {
          count: number | null
          severity: number | null
        }
        Relationships: []
      }
      v_mfa_coverage: {
        Row: {
          covered_count: number | null
          eligible_count: number | null
          mfa_coverage_pct: number | null
        }
        Relationships: []
      }
      v_open_critical_risks: {
        Row: {
          id: string | null
          likelihood: number | null
          owner_id: string | null
          score: number | null
          severity: number | null
          status: Database["public"]["Enums"]["risk_status"] | null
          system_id: string | null
          title: string | null
          vendor_id: string | null
        }
        Insert: {
          id?: string | null
          likelihood?: number | null
          owner_id?: string | null
          score?: number | null
          severity?: number | null
          status?: Database["public"]["Enums"]["risk_status"] | null
          system_id?: string | null
          title?: string | null
          vendor_id?: string | null
        }
        Update: {
          id?: string | null
          likelihood?: number | null
          owner_id?: string | null
          score?: number | null
          severity?: number | null
          status?: Database["public"]["Enums"]["risk_status"] | null
          system_id?: string | null
          title?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_health"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "risks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      v_overdue_reviews: {
        Row: {
          due_at: string | null
          id: string | null
          kind: string | null
          label: string | null
          owner_id: string | null
        }
        Relationships: []
      }
      v_sla_review_status: {
        Row: {
          is_overdue: boolean | null
          last_reviewed_at: string | null
          name: string | null
          review_cadence_days: number | null
          sla_id: string | null
          system_id: string | null
          target_type: Database["public"]["Enums"]["sla_target_type"] | null
          target_value: number | null
          vendor_id: string | null
        }
        Insert: {
          is_overdue?: never
          last_reviewed_at?: string | null
          name?: string | null
          review_cadence_days?: number | null
          sla_id?: string | null
          system_id?: string | null
          target_type?: Database["public"]["Enums"]["sla_target_type"] | null
          target_value?: number | null
          vendor_id?: string | null
        }
        Update: {
          is_overdue?: never
          last_reviewed_at?: string | null
          name?: string | null
          review_cadence_days?: number | null
          sla_id?: string | null
          system_id?: string | null
          target_type?: Database["public"]["Enums"]["sla_target_type"] | null
          target_value?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slas_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_vendor_health"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "slas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      v_vendor_health: {
        Row: {
          contract_end_at: string | null
          contract_ending_soon: boolean | null
          has_recent_open_breach: boolean | null
          name: string | null
          open_breaches_90d: number | null
          status: Database["public"]["Enums"]["vendor_status"] | null
          vendor_id: string | null
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
      breach_status: "open" | "remediated" | "escalated" | "closed_no_action"
      change_class: "standard" | "normal" | "emergency"
      change_status:
        | "proposed"
        | "approved"
        | "rejected"
        | "in_flight"
        | "completed"
        | "rolled_back"
      comms_audience:
        | "internal_it"
        | "leadership"
        | "staff_all"
        | "member"
        | "vendor"
        | "board"
      criticality: "low" | "medium" | "high" | "critical"
      data_class:
        | "none"
        | "member_pii"
        | "staff_pii"
        | "financial"
        | "unpublished_spec"
        | "public"
      dr_test_result: "pass" | "partial" | "fail"
      incident_status:
        | "declared"
        | "contained"
        | "resolved"
        | "post_mortem"
        | "closed"
      person_status: "active" | "inactive" | "offboarded"
      person_type: "staff" | "contractor" | "vendor_user" | "service_account"
      policy_status: "draft" | "approved" | "retired"
      risk_kind: "risk" | "exception"
      risk_status: "open" | "mitigating" | "accepted" | "closed"
      runbook_scenario:
        | "restore"
        | "outage"
        | "failover"
        | "continuity"
        | "offboarding"
      sla_target_type:
        | "uptime_pct"
        | "response_minutes"
        | "resolution_minutes"
        | "custom"
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
      vendor_status: "active" | "onboarding" | "offboarding" | "terminated"
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
      breach_status: ["open", "remediated", "escalated", "closed_no_action"],
      change_class: ["standard", "normal", "emergency"],
      change_status: [
        "proposed",
        "approved",
        "rejected",
        "in_flight",
        "completed",
        "rolled_back",
      ],
      comms_audience: [
        "internal_it",
        "leadership",
        "staff_all",
        "member",
        "vendor",
        "board",
      ],
      criticality: ["low", "medium", "high", "critical"],
      data_class: [
        "none",
        "member_pii",
        "staff_pii",
        "financial",
        "unpublished_spec",
        "public",
      ],
      dr_test_result: ["pass", "partial", "fail"],
      incident_status: [
        "declared",
        "contained",
        "resolved",
        "post_mortem",
        "closed",
      ],
      person_status: ["active", "inactive", "offboarded"],
      person_type: ["staff", "contractor", "vendor_user", "service_account"],
      policy_status: ["draft", "approved", "retired"],
      risk_kind: ["risk", "exception"],
      risk_status: ["open", "mitigating", "accepted", "closed"],
      runbook_scenario: [
        "restore",
        "outage",
        "failover",
        "continuity",
        "offboarding",
      ],
      sla_target_type: [
        "uptime_pct",
        "response_minutes",
        "resolution_minutes",
        "custom",
      ],
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
      vendor_status: ["active", "onboarding", "offboarding", "terminated"],
    },
  },
} as const
