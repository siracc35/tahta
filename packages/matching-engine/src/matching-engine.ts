import { OrderBook } from './order-book.js';
import type { BookSnapshot, ExecutionReport, NewOrder, Side, Trade } from './types.js';

const isPositiveInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

/**
 * Tek enstrüman için fiyat-zaman öncelikli eşleştirme motoru.
 *  - Fiyat önceliği: alışta en yüksek, satışta en düşük fiyat önce eşleşir.
 *  - Zaman önceliği: aynı fiyatta önce gelen önce eşleşir.
 *  - İşlem fiyatı, defterde bekleyen emrin fiyatıdır (taker lehine fiyat iyileşmesi).
 * Deterministiktir: saat kullanmaz, aynı emir dizisi her zaman aynı sonucu verir.
 */
export class MatchingEngine {
  private readonly book = new OrderBook();
  private tradeSequence = 0;

  submit(order: NewOrder): ExecutionReport {
    const error = this.validate(order);
    if (error) return this.rejected(order.id, error);

    const trades: Trade[] = [];
    let remaining = order.quantity;
    const opposite: Side = order.side === 'buy' ? 'sell' : 'buy';

    while (remaining > 0) {
      const maker = this.book.peekBest(opposite);
      if (!maker) break;
      if (order.type === 'limit' && !this.crosses(order.side, order.price!, maker.price)) break;

      const qty = Math.min(remaining, maker.remaining);
      const makerId = maker.id;
      const makerTrader = maker.traderId;
      const makerPrice = maker.price;
      this.book.consumeBest(opposite, qty);
      remaining -= qty;

      const buy = order.side === 'buy';
      trades.push({
        sequence: ++this.tradeSequence,
        price: makerPrice,
        quantity: qty,
        takerOrderId: order.id,
        makerOrderId: makerId,
        takerSide: order.side,
        buyerId: buy ? order.traderId : makerTrader,
        sellerId: buy ? makerTrader : order.traderId,
      });
    }

    const filled = order.quantity - remaining;
    const tif = order.timeInForce ?? 'GTC';
    const rests = remaining > 0 && order.type === 'limit' && tif === 'GTC';

    if (rests) {
      this.book.add({
        id: order.id,
        traderId: order.traderId,
        side: order.side,
        price: order.price!,
        remaining,
      });
    }

    return {
      orderId: order.id,
      status: remaining === 0 ? 'filled' : filled > 0 ? 'partially_filled' : rests ? 'resting' : 'cancelled',
      filledQuantity: filled,
      remainingQuantity: remaining,
      resting: rests,
      trades,
    };
  }

  /** Defterde bekleyen emri iptal eder. Emir yoksa (veya zaten dolduysa) false. */
  cancel(orderId: string): boolean {
    return this.book.cancel(orderId) !== undefined;
  }

  snapshot(depth?: number): BookSnapshot {
    return this.book.snapshot(depth);
  }

  bestBid(): number | undefined {
    return this.book.bestBid();
  }

  bestAsk(): number | undefined {
    return this.book.bestAsk();
  }

  private crosses(side: Side, limit: number, makerPrice: number): boolean {
    return side === 'buy' ? makerPrice <= limit : makerPrice >= limit;
  }

  private validate(o: NewOrder): string | undefined {
    if (!o.id) return 'Emir kimliği zorunlu';
    if (this.book.has(o.id)) return 'Bu kimlikle bekleyen bir emir zaten var';
    if (!isPositiveInt(o.quantity)) return 'Miktar pozitif tam sayı olmalı';
    if (o.type === 'limit' && !isPositiveInt(o.price)) return 'Limit emirde fiyat pozitif tam sayı olmalı';
    if (o.type === 'market' && o.price !== undefined) return 'Piyasa emrinde fiyat verilemez';
    if (o.type === 'market' && o.timeInForce === 'GTC') return 'Piyasa emri beklemez, GTC verilemez';
    return undefined;
  }

  private rejected(orderId: string, reason: string): ExecutionReport {
    return {
      orderId,
      status: 'rejected',
      filledQuantity: 0,
      remainingQuantity: 0,
      resting: false,
      trades: [],
      reason,
    };
  }
}
