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
      brand_workflows: {
        Row: {
          brand_id: number
          workflow_id: number
        }
        Insert: {
          brand_id: number
          workflow_id: number
        }
        Update: {
          brand_id?: number
          workflow_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "brand_workflows_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_workflows_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          category: string | null
          created_at: string
          flow_id: number | null
          id: number
          master_x: number | null
          master_y: number | null
          name: string
          original_node_id: number | null
          user_id: string
          website: string | null
          x: number | null
          y: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          flow_id?: number | null
          id?: never
          master_x?: number | null
          master_y?: number | null
          name: string
          original_node_id?: number | null
          user_id: string
          website?: string | null
          x?: number | null
          y?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          flow_id?: number | null
          id?: never
          master_x?: number | null
          master_y?: number | null
          name?: string
          original_node_id?: number | null
          user_id?: string
          website?: string | null
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brands_original_node_id_fkey"
            columns: ["original_node_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          connection_type: string | null
          created_at: string
          flow_id: number | null
          from_id: number
          from_type: string
          id: number
          to_id: number
          to_type: string
          user_id: string
        }
        Insert: {
          connection_type?: string | null
          created_at?: string
          flow_id?: number | null
          from_id: number
          from_type: string
          id?: never
          to_id: number
          to_type: string
          user_id: string
        }
        Update: {
          connection_type?: string | null
          created_at?: string
          flow_id?: number | null
          from_id?: number
          from_type?: string
          id?: never
          to_id?: number
          to_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          center_id: number
          center_type: string
          created_at: string
          id: number
          name: string
          user_id: string
        }
        Insert: {
          center_id: number
          center_type: string
          created_at?: string
          id?: never
          name: string
          user_id: string
        }
        Update: {
          center_id?: number
          center_type?: string
          created_at?: string
          id?: never
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_contacts: {
        Row: {
          connected_date: string | null
          empresa: string | null
          headline: string | null
          id: string
          imported_at: string | null
          name: string
          nicho: string | null
          photo_url: string | null
          profile_url: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          connected_date?: string | null
          empresa?: string | null
          headline?: string | null
          id?: string
          imported_at?: string | null
          name: string
          nicho?: string | null
          photo_url?: string | null
          profile_url?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          connected_date?: string | null
          empresa?: string | null
          headline?: string | null
          id?: string
          imported_at?: string | null
          name?: string
          nicho?: string | null
          photo_url?: string | null
          profile_url?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      people: {
        Row: {
          address: string | null
          birthday: string | null
          category: string | null
          company: string | null
          created_at: string
          department: string | null
          email: string | null
          email_secondary: string | null
          flow_id: number
          id: number
          master_x: number | null
          master_y: number | null
          name: string
          notes: string | null
          original_node_id: number | null
          phone: string | null
          phone_secondary: string | null
          phone_work: string | null
          profile_picture_url: string | null
          user_id: string
          website: string | null
          x: number | null
          y: number | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          category?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          email_secondary?: string | null
          flow_id: number
          id?: never
          master_x?: number | null
          master_y?: number | null
          name: string
          notes?: string | null
          original_node_id?: number | null
          phone?: string | null
          phone_secondary?: string | null
          phone_work?: string | null
          profile_picture_url?: string | null
          user_id: string
          website?: string | null
          x?: number | null
          y?: number | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          category?: string | null
          company?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          email_secondary?: string | null
          flow_id?: number
          id?: never
          master_x?: number | null
          master_y?: number | null
          name?: string
          notes?: string | null
          original_node_id?: number | null
          phone?: string | null
          phone_secondary?: string | null
          phone_work?: string | null
          profile_picture_url?: string | null
          user_id?: string
          website?: string | null
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "people_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_original_node_id_fkey"
            columns: ["original_node_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_workflows: {
        Row: {
          person_id: number
          workflow_id: number
        }
        Insert: {
          person_id: number
          workflow_id: number
        }
        Update: {
          person_id?: number
          workflow_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_workflows_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_workflows_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      project_workflows: {
        Row: {
          project_id: number
          workflow_id: number
        }
        Insert: {
          project_id: number
          workflow_id: number
        }
        Update: {
          project_id?: number
          workflow_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_workflows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_workflows_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          category: string | null
          created_at: string
          deadline: string | null
          flow_id: number
          id: number
          master_x: number | null
          master_y: number | null
          name: string
          original_node_id: number | null
          status: string | null
          user_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          deadline?: string | null
          flow_id: number
          id?: never
          master_x?: number | null
          master_y?: number | null
          name: string
          original_node_id?: number | null
          status?: string | null
          user_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          deadline?: string | null
          flow_id?: number
          id?: never
          master_x?: number | null
          master_y?: number | null
          name?: string
          original_node_id?: number | null
          status?: string | null
          user_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_original_node_id_fkey"
            columns: ["original_node_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          has_seen_onboarding: boolean | null
          id: string
          show_hints: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          has_seen_onboarding?: boolean | null
          id?: string
          show_hints?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          has_seen_onboarding?: boolean | null
          id?: string
          show_hints?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          activation_code: string | null
          connected_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          phone_number: string | null
          qr_code_token: string | null
          user_id: string
        }
        Insert: {
          activation_code?: string | null
          connected_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string | null
          qr_code_token?: string | null
          user_id: string
        }
        Update: {
          activation_code?: string | null
          connected_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string | null
          qr_code_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          pending_contact: Json | null
          phone_number: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          pending_contact?: Json | null
          phone_number: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          pending_contact?: Json | null
          phone_number?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: number
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: never
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: never
          name?: string
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
