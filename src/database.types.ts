export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          lhalf: string
          name: string
          rhalf: string
        }
        Insert: {
          id?: string
          lhalf: string
          name: string
          rhalf: string
        }
        Update: {
          id?: string
          lhalf?: string
          name?: string
          rhalf?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_lhalf_fkey"
            columns: ["lhalf"]
            isOneToOne: false
            referencedRelation: "halfflight"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_rhalf_fkey"
            columns: ["rhalf"]
            isOneToOne: false
            referencedRelation: "halfflight"
            referencedColumns: ["id"]
          },
        ]
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
          lresult: number[] | null
          lteam: string
          number: number
          rresult: number[] | null
          rteam: string
          video: string | null
        }
        Insert: {
          competition: string
          finishtime?: string | null
          flight: string
          id?: string
          league?: string
          lresult?: number[] | null
          lteam: string
          number: number
          rresult?: number[] | null
          rteam: string
          video?: string | null
        }
        Update: {
          competition?: string
          finishtime?: string | null
          flight?: string
          id?: string
          league?: string
          lresult?: number[] | null
          lteam?: string
          number?: number
          rresult?: number[] | null
          rteam?: string
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
      leaderboard_update: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
