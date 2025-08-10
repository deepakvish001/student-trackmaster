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
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          device_fingerprint: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          risk_score: number | null
          session_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          risk_score?: number | null
          session_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          risk_score?: number | null
          session_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      batches: {
        Row: {
          admin_name: string
          batch_name: string
          created_at: string
          id: string
          is_enabled: boolean
          max_students: number
          serial_number: string
          updated_at: string
          user_id: string | null
          username: string
        }
        Insert: {
          admin_name: string
          batch_name: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          max_students?: number
          serial_number: string
          updated_at?: string
          user_id?: string | null
          username: string
        }
        Update: {
          admin_name?: string
          batch_name?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          max_students?: number
          serial_number?: string
          updated_at?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      student_fingerprints: {
        Row: {
          capture_timestamp: string
          created_at: string
          finger_index: number
          id: string
          image_data: string | null
          pid_data: string
          quality_score: number | null
          student_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          capture_timestamp?: string
          created_at?: string
          finger_index: number
          id?: string
          image_data?: string | null
          pid_data: string
          quality_score?: number | null
          student_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          capture_timestamp?: string
          created_at?: string
          finger_index?: number
          id?: string
          image_data?: string | null
          pid_data?: string
          quality_score?: number | null
          student_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_fingerprints_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fingerprints_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "vw_students_optimized"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          batch_id: string
          created_at: string
          finger_1: string | null
          finger_1_image: string | null
          finger_2: string | null
          finger_2_image: string | null
          finger_3: string | null
          finger_3_image: string | null
          finger_4: string | null
          finger_4_image: string | null
          finger_5: string | null
          finger_5_image: string | null
          id: string
          is_enabled: boolean
          mobile_number: string | null
          student_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          batch_id: string
          created_at?: string
          finger_1?: string | null
          finger_1_image?: string | null
          finger_2?: string | null
          finger_2_image?: string | null
          finger_3?: string | null
          finger_3_image?: string | null
          finger_4?: string | null
          finger_4_image?: string | null
          finger_5?: string | null
          finger_5_image?: string | null
          id?: string
          is_enabled?: boolean
          mobile_number?: string | null
          student_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          batch_id?: string
          created_at?: string
          finger_1?: string | null
          finger_1_image?: string | null
          finger_2?: string | null
          finger_2_image?: string | null
          finger_3?: string | null
          finger_3_image?: string | null
          finger_4?: string | null
          finger_4_image?: string | null
          finger_5?: string | null
          finger_5_image?: string | null
          id?: string
          is_enabled?: boolean
          mobile_number?: string | null
          student_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_batches_optimized"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_logs: {
        Row: {
          check_type: string
          checked_at: string
          created_at: string
          details: Json | null
          id: string
          response_time_ms: number | null
          status: string
        }
        Insert: {
          check_type: string
          checked_at?: string
          created_at?: string
          details?: Json | null
          id?: string
          response_time_ms?: number | null
          status: string
        }
        Update: {
          check_type?: string
          checked_at?: string
          created_at?: string
          details?: Json | null
          id?: string
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      user_batch_access: {
        Row: {
          batch_id: string
          created_at: string
          granted_by: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_batch_access_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_batch_access_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_batches_optimized"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          failed_login_attempts: number | null
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          locked_until: string | null
          max_batches_allowed: number
          password_changed_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          session_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          failed_login_attempts?: number | null
          full_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          locked_until?: string | null
          max_batches_allowed?: number
          password_changed_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          session_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          failed_login_attempts?: number | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          locked_until?: string | null
          max_batches_allowed?: number
          password_changed_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          session_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      mv_dashboard_stats: {
        Row: {
          complete_biometrics: number | null
          last_updated: string | null
          partial_biometrics: number | null
          total_batches: number | null
          total_capacity: number | null
          total_students: number | null
          total_users: number | null
        }
        Relationships: []
      }
      vw_batches_optimized: {
        Row: {
          admin_name: string | null
          batch_name: string | null
          complete_biometrics: number | null
          created_at: string | null
          id: string | null
          is_enabled: boolean | null
          max_students: number | null
          partial_biometrics: number | null
          serial_number: string | null
          student_count: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          utilization_rate: number | null
        }
        Relationships: []
      }
      vw_students_optimized: {
        Row: {
          address: string | null
          admin_name: string | null
          batch_id: string | null
          batch_name: string | null
          biometric_status: string | null
          created_at: string | null
          finger_1: string | null
          finger_2: string | null
          finger_3: string | null
          finger_4: string | null
          finger_5: string | null
          fingerprint_count: number | null
          id: string | null
          is_enabled: boolean | null
          mobile_number: string | null
          student_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vw_batches_optimized"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_user_account: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_student_count_by_batch: {
        Args: { batch_ids: string[] }
        Returns: {
          batch_id: string
          student_count: number
        }[]
      }
      get_system_settings: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_accessible_batches: {
        Args: { target_user_id?: string }
        Returns: string[]
      }
      get_user_profile: {
        Args: { target_user_id: string }
        Returns: Json
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      handle_failed_login: {
        Args: { target_user_id: string }
        Returns: Json
      }
      is_account_locked: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_super_admin: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      log_high_risk_activity: {
        Args: {
          activity_type: string
          target_user_id: string
          risk_level: number
          details?: Json
        }
        Returns: undefined
      }
      refresh_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reset_failed_login_attempts: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      reset_system_settings_to_defaults: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      toggle_user_status: {
        Args: { target_user_id: string }
        Returns: Json
      }
      update_system_setting: {
        Args: { key: string; value: Json }
        Returns: Json
      }
      update_system_settings: {
        Args: { settings: Json }
        Returns: Json
      }
      update_user_role: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: Json
      }
      update_user_status: {
        Args: { target_user_id: string; new_status: boolean }
        Returns: Json
      }
      user_has_batch_access: {
        Args: { target_user_id: string; target_batch_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "super_admin" | "user"
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
      user_role: ["super_admin", "user"],
    },
  },
} as const
