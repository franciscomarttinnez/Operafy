export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type OrganizationRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  default_currency: string
  owner_id: string
  created_at: string
  updated_at: string
}

export type ProfileRow = {
  id: string
  full_name: string | null
  organization_id: string | null
  created_at: string
  updated_at: string
}

export type CustomerRow = {
  id: string
  organization_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export type QuoteRow = {
  id: string
  organization_id: string
  customer_id: string
  quote_number: string
  title: string
  notes: string | null
  status: QuoteStatus
  subtotal: number
  tax_amount: number
  discount_amount: number
  total: number
  created_at: string
  updated_at: string
}

export type QuoteLineItemRow = {
  id: string
  organization_id: string
  quote_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  position: number
  created_at: string
  updated_at: string
}

export type WorkOrderStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type WorkOrderRow = {
  id: string
  organization_id: string
  customer_id: string
  quote_id: string | null
  title: string
  description: string | null
  scheduled_date: string | null
  status: WorkOrderStatus
  billable_amount: number
  notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other'

export type PaymentRow = {
  id: string
  organization_id: string
  customer_id: string
  work_order_id: string
  amount: number
  method: PaymentMethod
  paid_at: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          address?: string | null
          default_currency?: string
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: ProfileRow
        Insert: {
          id: string
          full_name?: string | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'profiles_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      customers: {
        Row: CustomerRow
        Insert: {
          id?: string
          organization_id: string
          name: string
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'customers_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      quotes: {
        Row: QuoteRow
        Insert: {
          id?: string
          organization_id: string
          customer_id: string
          quote_number: string
          title: string
          notes?: string | null
          status?: QuoteStatus
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['quotes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'quotes_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
        ]
      }
      quote_line_items: {
        Row: QuoteLineItemRow
        Insert: {
          id?: string
          organization_id: string
          quote_id: string
          description: string
          quantity: number
          unit_price: number
          line_total: number
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['quote_line_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'quote_line_items_quote_id_fkey'
            columns: ['quote_id']
            isOneToOne: false
            referencedRelation: 'quotes'
            referencedColumns: ['id']
          },
        ]
      }
      work_orders: {
        Row: WorkOrderRow
        Insert: {
          id?: string
          organization_id: string
          customer_id: string
          quote_id?: string | null
          title: string
          description?: string | null
          scheduled_date?: string | null
          status?: WorkOrderStatus
          billable_amount: number
          notes?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['work_orders']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'work_orders_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'work_orders_quote_id_fkey'
            columns: ['quote_id']
            isOneToOne: false
            referencedRelation: 'quotes'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: PaymentRow
        Insert: {
          id?: string
          organization_id: string
          customer_id: string
          work_order_id: string
          amount: number
          method?: PaymentMethod
          paid_at?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'payments_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'customers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      create_organization_for_owner: {
        Args: {
          p_name: string
          p_phone?: string | null
          p_email?: string | null
          p_address?: string | null
          p_default_currency?: string
        }
        Returns: OrganizationRow
      }
      current_organization_id: {
        Args: Record<string, never>
        Returns: string | null
      }
      create_customer: {
        Args: {
          p_name: string
          p_phone?: string | null
          p_email?: string | null
          p_address?: string | null
          p_notes?: string | null
        }
        Returns: CustomerRow
      }
      update_customer: {
        Args: {
          p_customer_id: string
          p_name: string
          p_phone?: string | null
          p_email?: string | null
          p_address?: string | null
          p_notes?: string | null
        }
        Returns: CustomerRow
      }
      delete_customer: {
        Args: { p_customer_id: string }
        Returns: undefined
      }
      create_quote: {
        Args: {
          p_customer_id: string
          p_title: string
          p_notes?: string | null
          p_tax_amount?: number
          p_discount_amount?: number
          p_line_items: Json
        }
        Returns: QuoteRow
      }
      update_quote: {
        Args: {
          p_quote_id: string
          p_customer_id: string
          p_title: string
          p_notes?: string | null
          p_tax_amount?: number
          p_discount_amount?: number
          p_line_items: Json
        }
        Returns: QuoteRow
      }
      set_quote_status: {
        Args: {
          p_quote_id: string
          p_status: QuoteStatus
        }
        Returns: QuoteRow
      }
      delete_quote: {
        Args: { p_quote_id: string }
        Returns: undefined
      }
      create_work_order_from_quote: {
        Args: {
          p_quote_id: string
          p_scheduled_date?: string | null
          p_notes?: string | null
        }
        Returns: WorkOrderRow
      }
      create_work_order: {
        Args: {
          p_customer_id: string
          p_title: string
          p_description?: string | null
          p_billable_amount?: number
          p_scheduled_date?: string | null
          p_notes?: string | null
        }
        Returns: WorkOrderRow
      }
      update_work_order: {
        Args: {
          p_work_order_id: string
          p_title: string
          p_description?: string | null
          p_scheduled_date?: string | null
          p_notes?: string | null
          p_billable_amount?: number | null
        }
        Returns: WorkOrderRow
      }
      set_work_order_status: {
        Args: {
          p_work_order_id: string
          p_status: WorkOrderStatus
        }
        Returns: WorkOrderRow
      }
      delete_work_order: {
        Args: { p_work_order_id: string }
        Returns: undefined
      }
      create_payment: {
        Args: {
          p_work_order_id: string
          p_amount: number
          p_method?: PaymentMethod
          p_paid_at?: string | null
          p_notes?: string | null
        }
        Returns: PaymentRow
      }
      delete_payment: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
    }
    Enums: {
      quote_status: QuoteStatus
      work_order_status: WorkOrderStatus
      payment_method: PaymentMethod
    }
    CompositeTypes: Record<string, never>
  }
}

export type Organization = OrganizationRow
export type Profile = ProfileRow
export type Customer = CustomerRow
export type Quote = QuoteRow
export type QuoteLineItem = QuoteLineItemRow
export type WorkOrder = WorkOrderRow
export type Payment = PaymentRow

export type QuoteWithCustomer = Quote & {
  customers: Pick<Customer, 'id' | 'name' | 'email' | 'phone' | 'address'> | null
}

export type QuoteDetail = QuoteWithCustomer & {
  quote_line_items: QuoteLineItem[]
}

export type WorkOrderWithCustomer = WorkOrder & {
  customers: Pick<Customer, 'id' | 'name' | 'email' | 'phone' | 'address'> | null
  quotes: Pick<Quote, 'id' | 'quote_number' | 'title' | 'total' | 'status'> | null
}

export type PaymentWithRelations = Payment & {
  customers: Pick<Customer, 'id' | 'name'> | null
  work_orders: Pick<WorkOrder, 'id' | 'title' | 'billable_amount' | 'status'> | null
}
