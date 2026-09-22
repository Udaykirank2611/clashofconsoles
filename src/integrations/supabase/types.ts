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
      admin_notifications: {
        Row: {
          amount: number | null
          body: string
          booking_id: string | null
          booking_reference: string | null
          branch_id: string
          created_at: string
          customer_phone: string | null
          id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          amount?: number | null
          body?: string
          booking_id?: string | null
          booking_reference?: string | null
          branch_id: string
          created_at?: string
          customer_phone?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          amount?: number | null
          body?: string
          booking_id?: string | null
          booking_reference?: string | null
          branch_id?: string
          created_at?: string
          customer_phone?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
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
      booking_transactions: {
        Row: {
          admin_notes: string
          booking_id: string
          booking_source: string
          branch_id: string
          cash_amount: number
          created_at: string
          id: string
          transaction_status: string
          updated_at: string
          upi_amount: number
          upi_provider: string | null
        }
        Insert: {
          admin_notes?: string
          booking_id: string
          booking_source?: string
          branch_id: string
          cash_amount?: number
          created_at?: string
          id?: string
          transaction_status?: string
          updated_at?: string
          upi_amount?: number
          upi_provider?: string | null
        }
        Update: {
          admin_notes?: string
          booking_id?: string
          booking_source?: string
          branch_id?: string
          cash_amount?: number
          created_at?: string
          id?: string
          transaction_status?: string
          updated_at?: string
          upi_amount?: number
          upi_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          addons_amount: number
          bill_discount_amount: number
          booking_date: string
          booking_type: string
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
          food_discount_amount: number
          game_title: string | null
          gaming_discount_amount: number
          group_members: number
          id: string
          pass_id: string | null
          pass_minutes: number
          payment_expires_at: string | null
          payment_mode: string | null
          payment_note: string | null
          payment_submitted_at: string | null
          payment_utr: string | null
          players: number
          reference: string
          reward_minutes: number
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
          bill_discount_amount?: number
          booking_date: string
          booking_type?: string
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
          food_discount_amount?: number
          game_title?: string | null
          gaming_discount_amount?: number
          group_members?: number
          id?: string
          pass_id?: string | null
          pass_minutes?: number
          payment_expires_at?: string | null
          payment_mode?: string | null
          payment_note?: string | null
          payment_submitted_at?: string | null
          payment_utr?: string | null
          players?: number
          reference: string
          reward_minutes?: number
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
          bill_discount_amount?: number
          booking_date?: string
          booking_type?: string
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
          food_discount_amount?: number
          game_title?: string | null
          gaming_discount_amount?: number
          group_members?: number
          id?: string
          pass_id?: string | null
          pass_minutes?: number
          payment_expires_at?: string | null
          payment_mode?: string | null
          payment_note?: string | null
          payment_submitted_at?: string | null
          payment_utr?: string | null
          players?: number
          reference?: string
          reward_minutes?: number
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
            foreignKeyName: "bookings_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "membership_passes"
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
      branch_holidays: {
        Row: {
          branch_id: string
          created_at: string
          end_time: string | null
          holiday_date: string
          id: string
          reason: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          end_time?: string | null
          holiday_date: string
          id?: string
          reason?: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          end_time?: string | null
          holiday_date?: string
          id?: string
          reason?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
      cash_deposits: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          created_by: string | null
          deposit_date: string
          deposit_to: string
          description: string
          id: string
          name: string
          paid_at: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id: string
          created_at?: string
          created_by?: string | null
          deposit_date: string
          deposit_to?: string
          description?: string
          id?: string
          name: string
          paid_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          created_by?: string | null
          deposit_date?: string
          deposit_to?: string
          description?: string
          id?: string
          name?: string
          paid_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_deposits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          booking_id: string
          branch_id: string
          coupon_code: string
          coupon_id: string
          created_at: string
          customer_phone: string
          discount_amount: number
          id: string
        }
        Insert: {
          booking_id: string
          branch_id: string
          coupon_code: string
          coupon_id: string
          created_at?: string
          customer_phone: string
          discount_amount?: number
          id?: string
        }
        Update: {
          booking_id?: string
          branch_id?: string
          coupon_code?: string
          coupon_id?: string
          created_at?: string
          customer_phone?: string
          discount_amount?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
          active_days: number[]
          active_end_time: string | null
          active_start_time: string | null
          branch_id: string
          category: Database["public"]["Enums"]["coupon_category"]
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          ends_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          max_level: number | null
          min_level: number | null
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
          category?: Database["public"]["Enums"]["coupon_category"]
          code: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_level?: number | null
          min_level?: number | null
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
          category?: Database["public"]["Enums"]["coupon_category"]
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_level?: number | null
          min_level?: number | null
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
      customers: {
        Row: {
          created_at: string
          name: string
          phone: string
          total_visits: number
        }
        Insert: {
          created_at?: string
          name: string
          phone: string
          total_visits?: number
        }
        Update: {
          created_at?: string
          name?: string
          phone?: string
          total_visits?: number
        }
        Relationships: []
      }
      daily_closing_reports: {
        Row: {
          branch_id: string
          cancelled_bookings: number
          cash_revenue: number
          closed_by: string | null
          closed_by_email: string | null
          completed_bookings: number
          coupon_discounts: number
          created_at: string
          food_revenue: number
          gaming_revenue: number
          id: string
          membership_revenue: number
          notes: string
          pending_bookings: number
          report_date: string
          snapshot: Json
          student_discounts: number
          total_bookings: number
          total_customers: number
          total_revenue: number
          updated_at: string
          upi_revenue: number
        }
        Insert: {
          branch_id: string
          cancelled_bookings?: number
          cash_revenue?: number
          closed_by?: string | null
          closed_by_email?: string | null
          completed_bookings?: number
          coupon_discounts?: number
          created_at?: string
          food_revenue?: number
          gaming_revenue?: number
          id?: string
          membership_revenue?: number
          notes?: string
          pending_bookings?: number
          report_date: string
          snapshot?: Json
          student_discounts?: number
          total_bookings?: number
          total_customers?: number
          total_revenue?: number
          updated_at?: string
          upi_revenue?: number
        }
        Update: {
          branch_id?: string
          cancelled_bookings?: number
          cash_revenue?: number
          closed_by?: string | null
          closed_by_email?: string | null
          completed_bookings?: number
          coupon_discounts?: number
          created_at?: string
          food_revenue?: number
          gaming_revenue?: number
          id?: string
          membership_revenue?: number
          notes?: string
          pending_bookings?: number
          report_date?: string
          snapshot?: Json
          student_discounts?: number
          total_bookings?: number
          total_customers?: number
          total_revenue?: number
          updated_at?: string
          upi_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_closing_reports_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_expenses: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          name: string
          paid_at: string
          paid_from: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date: string
          id?: string
          name: string
          paid_at?: string
          paid_from?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          name?: string
          paid_at?: string
          paid_from?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_opening_balances: {
        Row: {
          balance_date: string
          branch_id: string
          created_at: string
          id: string
          opening_bank: number
          opening_cash: number
          updated_at: string
        }
        Insert: {
          balance_date: string
          branch_id: string
          created_at?: string
          id?: string
          opening_bank?: number
          opening_cash?: number
          updated_at?: string
        }
        Update: {
          balance_date?: string
          branch_id?: string
          created_at?: string
          id?: string
          opening_bank?: number
          opening_cash?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_opening_balances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      game_section_items: {
        Row: {
          badge: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          platform: string
          section_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          badge?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          platform?: string
          section_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          badge?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          platform?: string
          section_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "game_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sections: {
        Row: {
          accent: string
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          accent?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string
          title: string
          updated_at?: string
        }
        Update: {
          accent?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          subtitle?: string
          title?: string
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
      group_pass_rates: {
        Row: {
          branch_id: string
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          label: string
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
          label: string
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
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_pass_rates_branch_id_fkey"
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
      membership_passes: {
        Row: {
          branch_id: string
          code: string
          combo_console_minutes: number | null
          combo_sim_minutes: number | null
          combo_vr_minutes: number | null
          created_at: string
          customer_name: string
          expires_on: string
          id: string
          pass_type: Database["public"]["Enums"]["pass_kind"]
          phone: string
          plan_name: string
          price: number
          purchased_at: string
          remaining_minutes: number | null
          remaining_uses: number | null
          source_booking_id: string | null
          status: string
          total_minutes: number | null
          total_uses: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          code: string
          combo_console_minutes?: number | null
          combo_sim_minutes?: number | null
          combo_vr_minutes?: number | null
          created_at?: string
          customer_name: string
          expires_on: string
          id?: string
          pass_type: Database["public"]["Enums"]["pass_kind"]
          phone: string
          plan_name: string
          price?: number
          purchased_at?: string
          remaining_minutes?: number | null
          remaining_uses?: number | null
          source_booking_id?: string | null
          status?: string
          total_minutes?: number | null
          total_uses?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          code?: string
          combo_console_minutes?: number | null
          combo_sim_minutes?: number | null
          combo_vr_minutes?: number | null
          created_at?: string
          customer_name?: string
          expires_on?: string
          id?: string
          pass_type?: Database["public"]["Enums"]["pass_kind"]
          phone?: string
          plan_name?: string
          price?: number
          purchased_at?: string
          remaining_minutes?: number | null
          remaining_uses?: number | null
          source_booking_id?: string | null
          status?: string
          total_minutes?: number | null
          total_uses?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_passes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_passes_source_booking_id_fkey"
            columns: ["source_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
      message_templates: {
        Row: {
          body: string
          branch_id: string
          created_at: string
          id: string
          template_key: string
          updated_at: string
        }
        Insert: {
          body?: string
          branch_id: string
          created_at?: string
          id?: string
          template_key: string
          updated_at?: string
        }
        Update: {
          body?: string
          branch_id?: string
          created_at?: string
          id?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_branch_id_fkey"
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
      rewards: {
        Row: {
          booking_id: string | null
          created_at: string
          earned_at_visit: number | null
          expires_at_visit: number | null
          id: string
          minutes: number
          phone: string
          status: Database["public"]["Enums"]["reward_status"]
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          earned_at_visit?: number | null
          expires_at_visit?: number | null
          id?: string
          minutes?: number
          phone: string
          status?: Database["public"]["Enums"]["reward_status"]
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          earned_at_visit?: number | null
          expires_at_visit?: number | null
          id?: string
          minutes?: number
          phone?: string
          status?: Database["public"]["Enums"]["reward_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rewards_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_phone_fkey"
            columns: ["phone"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["phone"]
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
      site_media: {
        Row: {
          created_at: string
          key: string
          label: string
          media_type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          key: string
          label?: string
          media_type?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          label?: string
          media_type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
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
      complete_past_bookings: { Args: never; Returns: undefined }
      expire_membership_passes: { Args: never; Returns: undefined }
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
      next_pass_code: { Args: { _prefix: string }; Returns: string }
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
      coupon_category: "gaming" | "food" | "entire_bill"
      discount_type: "flat" | "percent"
      pass_kind:
        | "bronze"
        | "silver"
        | "gold"
        | "membership"
        | "combo"
        | "unlimited"
      reward_status: "available" | "used" | "expired"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      coupon_category: ["gaming", "food", "entire_bill"],
      discount_type: ["flat", "percent"],
      pass_kind: [
        "bronze",
        "silver",
        "gold",
        "membership",
        "combo",
        "unlimited",
      ],
      reward_status: ["available", "used", "expired"],
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
