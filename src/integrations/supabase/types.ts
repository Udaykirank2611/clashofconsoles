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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      booking_items: {
        Row: {
          booking_id: string
          created_at: string
          end_time: string | null
          extra_hour_price: number
          extra_hours: number
          id: string
          kind: Database["public"]["Enums"]["booking_item_kind"]
          label: string
          line_total: number
          menu_item_id: string | null
          quantity: number
          start_time: string | null
          station_id: string | null
          unit_price: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          end_time?: string | null
          extra_hour_price?: number
          extra_hours?: number
          id?: string
          kind?: Database["public"]["Enums"]["booking_item_kind"]
          label: string
          line_total?: number
          menu_item_id?: string | null
          quantity?: number
          start_time?: string | null
          station_id?: string | null
          unit_price?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          end_time?: string | null
          extra_hour_price?: number
          extra_hours?: number
          id?: string
          kind?: Database["public"]["Enums"]["booking_item_kind"]
          label?: string
          line_total?: number
          menu_item_id?: string | null
          quantity?: number
          start_time?: string | null
          station_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "gaming_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          addons_amount: number
          booking_date: string
          branch_id: string
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          discount_amount: number
          end_time: string | null
          food_amount: number
          game_title: string | null
          id: string
          payment_expires_at: string | null
          payment_note: string | null
          payment_submitted_at: string | null
          payment_utr: string | null
          players: number
          reference: string
          session_amount: number
          special_instructions: string | null
          start_time: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          student_discount: boolean
          student_discount_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          addons_amount?: number
          booking_date: string
          branch_id: string
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          discount_amount?: number
          end_time?: string | null
          food_amount?: number
          game_title?: string | null
          id?: string
          payment_expires_at?: string | null
          payment_note?: string | null
          payment_submitted_at?: string | null
          payment_utr?: string | null
          players?: number
          reference: string
          session_amount?: number
          special_instructions?: string | null
          start_time?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          student_discount?: boolean
          student_discount_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          addons_amount?: number
          booking_date?: string
          branch_id?: string
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          discount_amount?: number
          end_time?: string | null
          food_amount?: number
          game_title?: string | null
          id?: string
          payment_expires_at?: string | null
          payment_note?: string | null
          payment_submitted_at?: string | null
          payment_utr?: string | null
          players?: number
          reference?: string
          session_amount?: number
          special_instructions?: string | null
          start_time?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          student_discount?: boolean
          student_discount_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "gaming_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          city: string
          closes_at: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          map_url: string | null
          name: string
          opens_at: string
          phone: string | null
          slot_minutes: number
          slug: string
          sort_order: number
          tax_percent: number
          updated_at: string
        }
        Insert: {
          address?: string
          city?: string
          closes_at?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          map_url?: string | null
          name: string
          opens_at?: string
          phone?: string | null
          slot_minutes?: number
          slug: string
          sort_order?: number
          tax_percent?: number
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          closes_at?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          map_url?: string | null
          name?: string
          opens_at?: string
          phone?: string | null
          slot_minutes?: number
          slug?: string
          sort_order?: number
          tax_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active_days: number[]
          active_end_time: string | null
          active_start_time: string | null
          branch_id: string
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          ends_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_amount: number
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          active_days?: number[]
          active_end_time?: string | null
          active_start_time?: string | null
          branch_id: string
          code: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Update: {
          active_days?: number[]
          active_end_time?: string | null
          active_start_time?: string | null
          branch_id?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      experience_rates: {
        Row: {
          branch_id: string
          created_at: string
          experience_slug: string
          group_label: string
          id: string
          is_active: boolean
          label: string
          note: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          experience_slug: string
          group_label?: string
          id?: string
          is_active?: boolean
          label: string
          note?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          experience_slug?: string
          group_label?: string
          id?: string
          is_active?: boolean
          label?: string
          note?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_rates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          branch_ids: string[]
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          is_exclusive: boolean
          name: string
          price_unit: string
          slug: string
          sort_order: number
          starting_price: number
          station_type: Database["public"]["Enums"]["station_type"] | null
          updated_at: string
        }
        Insert: {
          branch_ids?: string[]
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_exclusive?: boolean
          name: string
          price_unit?: string
          slug: string
          sort_order?: number
          starting_price?: number
          station_type?: Database["public"]["Enums"]["station_type"] | null
          updated_at?: string
        }
        Update: {
          branch_ids?: string[]
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_exclusive?: boolean
          name?: string
          price_unit?: string
          slug?: string
          sort_order?: number
          starting_price?: number
          station_type?: Database["public"]["Enums"]["station_type"] | null
          updated_at?: string
        }
        Relationships: []
      }
      gaming_stations: {
        Row: {
          branch_id: string
          created_at: string
          description: string | null
          games: string[]
          group_label: string
          hourly_price: number
          id: string
          image_url: string | null
          is_addon: boolean
          name: string
          sort_order: number
          station_type: Database["public"]["Enums"]["station_type"]
          status: Database["public"]["Enums"]["station_status"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          description?: string | null
          games?: string[]
          group_label?: string
          hourly_price?: number
          id?: string
          image_url?: string | null
          is_addon?: boolean
          name: string
          sort_order?: number
          station_type?: Database["public"]["Enums"]["station_type"]
          status?: Database["public"]["Enums"]["station_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          description?: string | null
          games?: string[]
          group_label?: string
          hourly_price?: number
          id?: string
          image_url?: string | null
          is_addon?: boolean
          name?: string
          sort_order?: number
          station_type?: Database["public"]["Enums"]["station_type"]
          status?: Database["public"]["Enums"]["station_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gaming_stations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_cards: {
        Row: {
          badge: string
          body: string
          created_at: string
          discount_percent: number
          features: string[]
          hours_included: number
          id: string
          image_url: string | null
          is_visible: boolean
          kind: string
          min_bill: number
          price_unit: string
          sort_order: number
          starting_price: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          badge?: string
          body?: string
          created_at?: string
          discount_percent?: number
          features?: string[]
          hours_included?: number
          id?: string
          image_url?: string | null
          is_visible?: boolean
          kind: string
          min_bill?: number
          price_unit?: string
          sort_order?: number
          starting_price?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          badge?: string
          body?: string
          created_at?: string
          discount_percent?: number
          features?: string[]
          hours_included?: number
          id?: string
          image_url?: string | null
          is_visible?: boolean
          kind?: string
          min_bill?: number
          price_unit?: string
          sort_order?: number
          starting_price?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          booking_id: string | null
          created_at: string
          customer_profile_id: string | null
          id: string
          points: number
          reason: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          customer_profile_id?: string | null
          id?: string
          points?: number
          reason?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          customer_profile_id?: string | null
          id?: string
          points?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_points_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          badge: string
          branch_id: string
          created_at: string
          hours_included: number
          id: string
          is_popular: boolean
          is_visible: boolean
          name: string
          perks: string[]
          price: number
          sort_order: number
          updated_at: string
          validity: string
        }
        Insert: {
          badge?: string
          branch_id: string
          created_at?: string
          hours_included?: number
          id?: string
          is_popular?: boolean
          is_visible?: boolean
          name: string
          perks?: string[]
          price?: number
          sort_order?: number
          updated_at?: string
          validity?: string
        }
        Update: {
          badge?: string
          branch_id?: string
          created_at?: string
          hours_included?: number
          id?: string
          is_popular?: boolean
          is_visible?: boolean
          name?: string
          perks?: string[]
          price?: number
          sort_order?: number
          updated_at?: string
          validity?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_visible: boolean
          slug: string
          sort_order: number
          starting_price: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean
          slug: string
          sort_order?: number
          starting_price?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean
          slug?: string
          sort_order?: number
          starting_price?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          branch_id: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          account_name: string
          branch_id: string
          created_at: string
          expiry_minutes: number
          id: string
          instructions: string
          qr_image_url: string | null
          updated_at: string
          upi_id: string
        }
        Insert: {
          account_name?: string
          branch_id: string
          created_at?: string
          expiry_minutes?: number
          id?: string
          instructions?: string
          qr_image_url?: string | null
          updated_at?: string
          upi_id?: string
        }
        Update: {
          account_name?: string
          branch_id?: string
          created_at?: string
          expiry_minutes?: number
          id?: string
          instructions?: string
          qr_image_url?: string | null
          updated_at?: string
          upi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          provider: string | null
          provider_ref: string | null
          status: string
        }
        Insert: {
          amount?: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rates: {
        Row: {
          branch_id: string
          created_at: string
          duration_minutes: number
          id: string
          players: number
          price: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          duration_minutes: number
          id?: string
          players: number
          price?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          players?: number
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_locks: {
        Row: {
          booking_date: string
          branch_id: string
          created_at: string
          end_time: string
          expires_at: string
          id: string
          released_at: string | null
          session_token: string
          start_time: string
          station_id: string
        }
        Insert: {
          booking_date: string
          branch_id: string
          created_at?: string
          end_time?: string
          expires_at: string
          id?: string
          released_at?: string | null
          session_token: string
          start_time: string
          station_id: string
        }
        Update: {
          booking_date?: string
          branch_id?: string
          created_at?: string
          end_time?: string
          expires_at?: string
          id?: string
          released_at?: string | null
          session_token?: string
          start_time?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_locks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_locks_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "gaming_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_options: {
        Row: {
          branch_id: string
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          label: string
          players: number | null
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          label?: string
          players?: number | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          label?: string
          players?: number | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_options_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      site_offers: {
        Row: {
          branch_id: string
          discount_percent: number
          features: string[]
          id: string
          is_visible: boolean
          min_bill: number
          offer_text: string
          price: number
          subtitle: string
          title: string
          updated_at: string
          validity: string
        }
        Insert: {
          branch_id: string
          discount_percent?: number
          features?: string[]
          id: string
          is_visible?: boolean
          min_bill?: number
          offer_text?: string
          price?: number
          subtitle?: string
          title?: string
          updated_at?: string
          validity?: string
        }
        Update: {
          branch_id?: string
          discount_percent?: number
          features?: string[]
          id?: string
          is_visible?: boolean
          min_bill?: number
          offer_text?: string
          price?: number
          subtitle?: string
          title?: string
          updated_at?: string
          validity?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_offers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      station_games: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          station_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          station_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          station_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_games_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_games_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "gaming_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_rates: {
        Row: {
          branch_id: string
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          is_extra_hour: boolean
          label: string
          note: string
          price: number
          sort_order: number
          station_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_extra_hour?: boolean
          label: string
          note?: string
          price?: number
          sort_order?: number
          station_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_extra_hour?: boolean
          label?: string
          note?: string
          price?: number
          sort_order?: number
          station_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_rates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_rates_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "gaming_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_stale_bookings: { Args: never; Returns: undefined }
      get_slot_availability: {
        Args: { _branch_id: string; _date: string }
        Returns: {
          end_time: string
          source: string
          start_time: string
          station_id: string
        }[]
      }
      next_booking_reference: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "owner" | "branch_admin"
      booking_item_kind: "food" | "addon"
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "expired"
        | "awaiting_payment"
        | "payment_pending"
      discount_type: "flat" | "percent"
      station_status: "available" | "maintenance" | "blocked"
      station_type:
        | "console"
        | "driving_simulator"
        | "vr"
        | "snooker"
        | "private_theatre"
        | "private_lounge"
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
      app_role: ["owner", "branch_admin"],
      booking_item_kind: ["food", "addon"],
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "expired",
        "awaiting_payment",
        "payment_pending",
      ],
      discount_type: ["flat", "percent"],
      station_status: ["available", "maintenance", "blocked"],
      station_type: [
        "console",
        "driving_simulator",
        "vr",
        "snooker",
        "private_theatre",
        "private_lounge",
      ],
    },
  },
} as const
