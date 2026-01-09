// DynamoDB 테이블 타입 정의

// ==================== Venue (매장) ====================
export interface Venue {
  venue_id: string;
  name: string;
  address: string;
  owner_id: string;
  qr_code_data?: string;
  business_number?: string;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// ==================== Beer (맥주) ====================
export interface Beer {
  beer_id: string;
  name: string;
  brand: string;
  style: string;
  abv: number;
  description?: string;
  image_url?: string;
  default_price: number;
  default_volume_ml: number;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// ==================== VenueDispenser (매장-디스펜서 매핑) ====================
export interface VenueDispenser {
  venue_id: string;
  dispenser_id: string;
  beer_id: string;
  dispenser_number: number;
  position_description?: string;
  price: number;
  volume_ml: number;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// ==================== User (관리자/운영자) ====================
export type UserRole = 'super_admin' | 'venue_owner';

export interface User {
  user_id: string;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// ==================== Customer (고객 - 성인인증) ====================
export type Gender = 'M' | 'F';

export interface Customer {
  customer_id: string;
  phone: string;
  ci: string;
  di: string;
  name: string;
  birth_date: string;
  gender: Gender;
  is_adult: boolean;
  verified_at: number;
  created_at: number;
  updated_at: number;
}

// ==================== Order (주문) ====================
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'ready'
  | 'dispensing'
  | 'completed'
  | 'failed'
  | 'refunded';

export type PaymentMethod = 'toss' | 'kakaopay' | 'naverpay' | null;

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: number;
  message?: string;
}

export interface Order {
  order_id: string;
  venue_id: string;
  dispenser_id: string;
  beer_id: string;
  customer_id: string;
  dispenser_number: number;

  // 주문 정보 (스냅샷)
  beer_name: string;
  volume_ml: number;
  price: number;

  // 상태
  status: OrderStatus;
  status_history: StatusHistoryEntry[];

  // 결제 정보
  payment_method: PaymentMethod;
  payment_key?: string;
  payment_approved_at?: number;

  // 디스펜싱 정보
  dispensed_ml?: number;
  dispense_started_at?: number;
  dispense_completed_at?: number;

  // 타임스탬프
  created_at: number;
  updated_at: number;
}

// ==================== DispenseLog (디스펜싱 로그) ====================
export type TriggerType = 'online_order' | 'button' | 'nfc' | 'test';

export interface DispenseLog {
  log_id: string;
  dispenser_id: string;
  order_id?: string;
  venue_id?: string;

  // 디스펜싱 상세
  trigger_type: TriggerType;
  volume_ml: number;
  duration_ms: number;
  flowmeter_pulses?: number;

  // 기기 상태 스냅샷
  pressure_psi?: number;
  temperature_c?: number;
  keg_remaining_pct?: number;

  // 결과
  success: boolean;
  error_code?: string;
  error_message?: string;

  timestamp: number;
  created_at: number;
}

// ==================== API Response Types ====================
export interface VenueWithBeers extends Venue {
  dispensers: (VenueDispenser & { beer: Beer })[];
}

export interface OrderWithDetails extends Order {
  venue?: Venue;
  beer?: Beer;
  customer?: Omit<Customer, 'ci' | 'di' | 'password_hash'>;
}

// ==================== Input Types (생성/수정용) ====================
export type CreateVenueInput = Omit<Venue, 'venue_id' | 'created_at' | 'updated_at'>;
export type UpdateVenueInput = Partial<Omit<Venue, 'venue_id' | 'created_at' | 'updated_at'>>;

export type CreateBeerInput = Omit<Beer, 'beer_id' | 'created_at' | 'updated_at'>;
export type UpdateBeerInput = Partial<Omit<Beer, 'beer_id' | 'created_at' | 'updated_at'>>;

export type CreateUserInput = Omit<User, 'user_id' | 'password_hash' | 'created_at' | 'updated_at'> & { password: string };
export type UpdateUserInput = Partial<Omit<User, 'user_id' | 'password_hash' | 'created_at' | 'updated_at'>> & { password?: string };

export type CreateVenueDispenserInput = Omit<VenueDispenser, 'created_at' | 'updated_at'>;
export type UpdateVenueDispenserInput = Partial<Omit<VenueDispenser, 'venue_id' | 'dispenser_id' | 'created_at' | 'updated_at'>>;

export type CreateOrderInput = {
  venue_id: string;
  dispenser_id: string;
  customer_id: string;
};

export type CreateDispenseLogInput = Omit<DispenseLog, 'log_id' | 'created_at'>;
