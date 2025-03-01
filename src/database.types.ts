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
          uuid: string
        }
        Insert: {
          uuid?: string
        }
        Update: {
          uuid?: string
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
      leaderboard: {
        Row: {
          avg_pts: number
          league: string
          losses: number
          order: number
          team: string
          wins: number
        }
        Insert: {
          avg_pts: number
          league?: string
          losses: number
          order?: number
          team: string
          wins: number
        }
        Update: {
          avg_pts?: number
          league?: string
          losses?: number
          order?: number
          team?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_team_fkey"
            columns: ["team"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      race: {
        Row: {
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
      raceteam: {
        Row: {
          halfflight: string
          race: string
          result: number[] | null
          team: string
        }
        Insert: {
          halfflight: string
          race: string
          result?: number[] | null
          team: string
        }
        Update: {
          halfflight?: string
          race?: string
          result?: number[] | null
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "raceteam_flight_fkey"
            columns: ["halfflight"]
            isOneToOne: false
            referencedRelation: "halfflight"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raceteam_race_fkey"
            columns: ["race"]
            isOneToOne: false
            referencedRelation: "race"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raceteam_team_fkey"
            columns: ["team"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          announcement: string | null
          estimates: boolean
          go_to_stand: number
          racing_paused: boolean
          uuid: string
        }
        Insert: {
          announcement?: string | null
          estimates?: boolean
          go_to_stand: number
          racing_paused?: boolean
          uuid?: string
        }
        Update: {
          announcement?: string | null
          estimates?: boolean
          go_to_stand?: number
          racing_paused?: boolean
          uuid?: string
        }
        Relationships: []
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
      tiebreak: {
        Row: {
          league: string
          order: number
          team: string
        }
        Insert: {
          league: string
          order: number
          team: string
        }
        Update: {
          league?: string
          order?: number
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiebreaks_team_fkey"
            columns: ["team"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id"]
          },
        ]
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
