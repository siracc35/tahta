import type { BookLevel, BookSnapshot, Side } from './types.js';

export interface RestingOrder {
  id: string;
  traderId: string;
  side: Side;
  price: number;
  remaining: number;
}

interface PriceLevel {
  price: number;
  /** Zaman önceliği: dizinin başı en eski emir. */
  orders: RestingOrder[];
  quantity: number;
}

/**
 * Emir defteri. Her taraf için fiyat seviyeleri sıralı tutulur:
 * en iyi fiyat her zaman dizinin 0. elemanıdır.
 *  - bids: yüksekten düşüğe, asks: düşükten yükseğe.
 * Seviye bulma/ekleme ikili aramayla O(log n); en iyi fiyata erişim O(1).
 */
export class OrderBook {
  private bids: PriceLevel[] = [];
  private asks: PriceLevel[] = [];
  private index = new Map<string, RestingOrder>();

  has(id: string): boolean {
    return this.index.has(id);
  }

  bestBid(): number | undefined {
    return this.bids[0]?.price;
  }

  bestAsk(): number | undefined {
    return this.asks[0]?.price;
  }

  /** Karşı taraftaki en iyi seviyenin en eski emri (silmeden). */
  peekBest(side: Side): RestingOrder | undefined {
    return this.levels(side)[0]?.orders[0];
  }

  add(order: RestingOrder): void {
    const levels = this.levels(order.side);
    const pos = this.findPosition(levels, order.price, order.side);
    let level = levels[pos];
    if (!level || level.price !== order.price) {
      level = { price: order.price, orders: [], quantity: 0 };
      levels.splice(pos, 0, level);
    }
    level.orders.push(order);
    level.quantity += order.remaining;
    this.index.set(order.id, order);
  }

  /** En iyi seviyenin başındaki emirden `qty` kadar tüketir; dolduysa defterden siler. */
  consumeBest(side: Side, qty: number): void {
    const levels = this.levels(side);
    const level = levels[0];
    const order = level?.orders[0];
    if (!level || !order) throw new Error('consumeBest: defter boş');
    order.remaining -= qty;
    level.quantity -= qty;
    if (order.remaining === 0) {
      level.orders.shift();
      this.index.delete(order.id);
      if (level.orders.length === 0) levels.shift();
    }
  }

  cancel(id: string): RestingOrder | undefined {
    const order = this.index.get(id);
    if (!order) return undefined;
    const levels = this.levels(order.side);
    const pos = this.findPosition(levels, order.price, order.side);
    const level = levels[pos];
    if (level && level.price === order.price) {
      const i = level.orders.findIndex((o) => o.id === id);
      if (i >= 0) level.orders.splice(i, 1);
      level.quantity -= order.remaining;
      if (level.orders.length === 0) levels.splice(pos, 1);
    }
    this.index.delete(id);
    return order;
  }

  snapshot(depth = Infinity): BookSnapshot {
    const map = (l: PriceLevel): BookLevel => ({
      price: l.price,
      quantity: l.quantity,
      orders: l.orders.length,
    });
    return {
      bids: this.bids.slice(0, depth).map(map),
      asks: this.asks.slice(0, depth).map(map),
    };
  }

  private levels(side: Side): PriceLevel[] {
    return side === 'buy' ? this.bids : this.asks;
  }

  /** Verilen fiyatın girmesi gereken (veya zaten bulunduğu) indeks. */
  private findPosition(levels: PriceLevel[], price: number, side: Side): number {
    let lo = 0;
    let hi = levels.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const p = levels[mid]!.price;
      const before = side === 'buy' ? p > price : p < price;
      if (before) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}
