/**
 * Fiyatlar ve miktarlar POZİTİF TAM SAYIDIR.
 * Fiyat en küçük birimde tutulur (örn. kuruş); float yuvarlama hatası olmasın diye.
 */
export type Side = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
/** GTC: kalan miktar defterde bekler. IOC: kalan miktar anında iptal edilir. */
export type TimeInForce = 'GTC' | 'IOC';

export interface NewOrder {
  id: string;
  traderId: string;
  side: Side;
  type: OrderType;
  quantity: number;
  /** Limit emirlerde zorunlu, piyasa emirlerinde olmamalı. */
  price?: number;
  timeInForce?: TimeInForce;
}

export interface Trade {
  /** Motor içinde artan işlem numarası. */
  sequence: number;
  /** İşlem fiyatı her zaman defterde bekleyen (maker) emrin fiyatıdır. */
  price: number;
  quantity: number;
  takerOrderId: string;
  makerOrderId: string;
  takerSide: Side;
  buyerId: string;
  sellerId: string;
}

export type OrderStatus =
  | 'filled' // tamamı doldu
  | 'partially_filled' // bir kısmı doldu (kalan ya bekliyor ya iptal)
  | 'resting' // hiç dolmadı, defterde bekliyor
  | 'cancelled' // hiç dolmadı ve defterde beklemiyor (piyasa/IOC)
  | 'rejected'; // geçersiz emir

export interface ExecutionReport {
  orderId: string;
  status: OrderStatus;
  filledQuantity: number;
  remainingQuantity: number;
  /** Kalan miktar defterde bekliyor mu? */
  resting: boolean;
  trades: Trade[];
  reason?: string;
}

export interface BookLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface BookSnapshot {
  /** Yüksekten düşüğe. */
  bids: BookLevel[];
  /** Düşükten yükseğe. */
  asks: BookLevel[];
}
