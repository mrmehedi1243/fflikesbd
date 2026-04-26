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
      app_settings: {
        Row: {
          banner_api_url: string
          bkash_number: string
          bkash_number_visit: string
          id: number
          like_api_url: string
          payment_instructions: string
          updated_at: string
          visit_api_url: string
        }
        Insert: {
          banner_api_url: string
          bkash_number: string
          bkash_number_visit?: string
          id?: number
          like_api_url: string
          payment_instructions: string
          updated_at?: string
          visit_api_url?: string
        }
        Update: {
          banner_api_url?: string
          bkash_number?: string
          bkash_number_visit?: string
          id?: number
          like_api_url?: string
          payment_instructions?: string
          updated_at?: string
          visit_api_url?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          type: Database["public"]["Enums"]["package_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          type?: Database["public"]["Enums"]["package_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["package_type"]
          updated_at?: string
        }
        Relationships: []
      }
      like_logs: {
        Row: {
          api_response: Json | null
          created_at: string
          error_message: string | null
          id: string
          likes_sent: number
          order_id: string
          run_date: string
          success: boolean
        }
        Insert: {
          api_response?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          likes_sent?: number
          order_id: string
          run_date?: string
          success?: boolean
        }
        Update: {
          api_response?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          likes_sent?: number
          order_id?: string
          run_date?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "like_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          approved_at: string | null
          created_at: string
          days_completed: number
          duration_days: number
          ff_uid: string
          id: string
          likes_per_day: number
          next_run_at: string | null
          package_id: string
          payment_screenshot_url: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_likes_sent: number
          trx_id: string
          type: Database["public"]["Enums"]["package_type"]
          updated_at: string
          user_id: string
          visits_delivered: number
          visits_target: number
        }
        Insert: {
          admin_note?: string | null
          approved_at?: string | null
          created_at?: string
          days_completed?: number
          duration_days: number
          ff_uid: string
          id?: string
          likes_per_day: number
          next_run_at?: string | null
          package_id: string
          payment_screenshot_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_likes_sent?: number
          trx_id: string
          type?: Database["public"]["Enums"]["package_type"]
          updated_at?: string
          user_id: string
          visits_delivered?: number
          visits_target?: number
        }
        Update: {
          admin_note?: string | null
          approved_at?: string | null
          created_at?: string
          days_completed?: number
          duration_days?: number
          ff_uid?: string
          id?: string
          likes_per_day?: number
          next_run_at?: string | null
          package_id?: string
          payment_screenshot_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_likes_sent?: number
          trx_id?: string
          type?: Database["public"]["Enums"]["package_type"]
          updated_at?: string
          user_id?: string
          visits_delivered?: number
          visits_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          duration_days: number
          id: string
          image_url: string | null
          is_active: boolean
          likes_per_day: number
          name: string
          price_bdt: number
          sort_order: number
          type: Database["public"]["Enums"]["package_type"]
          updated_at: string
          visits_count: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_days: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          likes_per_day: number
          name: string
          price_bdt: number
          sort_order?: number
          type?: Database["public"]["Enums"]["package_type"]
          updated_at?: string
          visits_count?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          likes_per_day?: number
          name?: string
          price_bdt?: number
          sort_order?: number
          type?: Database["public"]["Enums"]["package_type"]
          updated_at?: string
          visits_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "packages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      visit_logs: {
        Row: {
          api_response: Json | null
          created_at: string
          error_message: string | null
          id: string
          order_id: string
          success: boolean
          visits_sent: number
        }
        Insert: {
          api_response?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          order_id: string
          success?: boolean
          visits_sent?: number
        }
        Update: {
          api_response?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string
          success?: boolean
          visits_sent?: number
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
      order_status: "pending" | "approved" | "rejected" | "completed"
      package_type: "like" | "visit"
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
      order_status: ["pending", "approved", "rejected", "completed"],
      package_type: ["like", "visit"],
    },
  },
} as const
