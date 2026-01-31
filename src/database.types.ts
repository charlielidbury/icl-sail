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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin: {
        Row: {
          competition: string
          user: string
        }
        Insert: {
          competition: string
          user: string
        }
        Update: {
          competition?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_competition_fkey"
            columns: ["competition"]
            isOneToOne: false
            referencedRelation: "competition"
            referencedColumns: ["id"]
          },
        ]
      }
      competition: {
        Row: {
          announcement: string | null
          estimates: boolean
          feedback: boolean
          finals_markdown: string | null
          go_to_stand: number
          host: string
          id: string
          name: string
          racing_paused: boolean
        }
        Insert: {
          announcement?: string | null
          estimates?: boolean
          feedback?: boolean
          finals_markdown?: string | null
          go_to_stand?: number
          host: string
          id: string
          name: string
          racing_paused?: boolean
        }
        Update: {
          announcement?: string | null
          estimates?: boolean
          feedback?: boolean
          finals_markdown?: string | null
          go_to_stand?: number
          host?: string
          id?: string
          name?: string
          racing_paused?: boolean
        }
        Relationships: []
      }
      feedback: {
        Row: {
          body: string
          created_at: string
          hidden: boolean
          id: number
          response: string | null
        }
        Insert: {
          body: string
          created_at?: string
          hidden?: boolean
          id?: number
          response?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          hidden?: boolean
          id?: number
          response?: string | null
        }
        Relationships: []
      }
      flight: {
        Row: {
          id: string
          lname: string
          lnumbers: number[]
          name: string
          rname: string
          rnumbers: number[]
        }
        Insert: {
          id?: string
          lname: string
          lnumbers: number[]
          name: string
          rname: string
          rnumbers: number[]
        }
        Update: {
          id?: string
          lname?: string
          lnumbers?: number[]
          name?: string
          rname?: string
          rnumbers?: number[]
        }
        Relationships: []
      }
      halfflight: {
        Row: {
          id: string
          name: string
          numbers: number[]
        }
        Insert: {
          id?: string
          name: string
          numbers: number[]
        }
        Update: {
          id?: string
          name?: string
          numbers?: number[]
        }
        Relationships: []
      }
      race: {
        Row: {
          competition: string
          finishtime: string | null
          flight: string
          id: string
          league: string
          lplaceholder: string | null
          lresult: number[] | null
          lteam: string | null
          number: number
          rplaceholder: string | null
          rresult: number[] | null
          rteam: string | null
          video: string | null
        }
        Insert: {
          competition: string
          finishtime?: string | null
          flight: string
          id?: string
          league?: string
          lplaceholder?: string | null
          lresult?: number[] | null
          lteam?: string | null
          number: number
          rplaceholder?: string | null
          rresult?: number[] | null
          rteam?: string | null
          video?: string | null
        }
        Update: {
          competition?: string
          finishtime?: string | null
          flight?: string
          id?: string
          league?: string
          lplaceholder?: string | null
          lresult?: number[] | null
          lteam?: string | null
          number?: number
          rplaceholder?: string | null
          rresult?: number[] | null
          rteam?: string | null
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_competition_fkey"
            columns: ["competition"]
            isOneToOne: false
            referencedRelation: "competition"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_flight_fkey"
            columns: ["flight"]
            isOneToOne: false
            referencedRelation: "flight"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_lteam_fkey"
            columns: ["lteam"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_rteam_fkey"
            columns: ["rteam"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      team: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      leaderboard_update: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
