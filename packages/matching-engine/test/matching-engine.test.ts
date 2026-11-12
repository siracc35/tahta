import { describe, expect, it } from 'vitest';
import { MatchingEngine } from '../src/index.js';
import type { NewOrder, Side } from '../src/index.js';

const limit = (id: string, side: Side, price: number, quantity: number, traderId = id): NewOrder => ({
  id,
  traderId,
  side,
  type: 'limit',
  price,
  quantity,
});
const market = (id: string, side: Side, quantity: number): NewOrder => ({
  id,
  traderId: id,
  side,
  type: 'market',
  quantity,
});

describe('limit emirleri', () => {
  it('karşı emir yoksa defterde bekler', () => {
    const e = new MatchingEngine();
    const r = e.submit(limit('b1', 'buy', 100, 10));
    expect(r.status).toBe('resting');
    expect(r.resting).toBe(true);
    expect(e.bestBid()).toBe(100);
  });

  it('fiyatlar kesişince bekleyen emrin fiyatından işlem yapar', () => {
    const e = new MatchingEngine();
    e.submit(limit('s1', 'sell', 100, 10));
    const r = e.submit(limit('b1', 'buy', 105, 10));
    expect(r.status).toBe('filled');
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]).toMatchObject({ price: 100, quantity: 10, makerOrderId: 's1', takerOrderId: 'b1' });
    expect(e.snapshot()).toEqual({ bids: [], asks: [] });
  });

  it('kesişmeyen fiyatta eşleşmez', () => {
    const e = new MatchingEngine();
    e.submit(limit('s1', 'sell', 101, 10));
    const r = e.submit(limit('b1', 'buy', 100, 10));
    expect(r.trades).toHaveLength(0);
    expect(e.bestBid()).toBe(100);
    expect(e.bestAsk()).toBe(101);
  });

  it('kısmi dolumda kalan miktar defterde bekler', () => {
    const e = new MatchingEngine();
    e.submit(limit('s1', 'sell', 100, 4));
    const r = e.submit(limit('b1', 'buy', 100, 10));
    expect(r.status).toBe('partially_filled');
    expect(r.filledQuantity).toBe(4);
    expect(r.remainingQuantity).toBe(6);
    expect(r.resting).toBe(true);
    expect(e.snapshot().bids).toEqual([{ price: 100, quantity: 6, orders: 1 }]);
  });
});

describe('öncelik kuralları', () => {
  it('fiyat önceliği: alışta en yüksek bid önce eşleşir', () => {
    const e = new MatchingEngine();
    e.submit(limit('b1', 'buy', 99, 5));
    e.submit(limit('b2', 'buy', 101, 5));
    const r = e.submit(limit('s1', 'sell', 99, 5));
    expect(r.trades[0]).toMatchObject({ makerOrderId: 'b2', price: 101 });
  });

  it('zaman önceliği: aynı fiyatta önce gelen önce eşleşir', () => {
    const e = new MatchingEngine();
    e.submit(limit('s1', 'sell', 100, 5));
    e.submit(limit('s2', 'sell', 100, 5));
    const r = e.submit(limit('b1', 'buy', 100, 7));
    expect(r.trades.map((t) => [t.makerOrderId, t.quantity])).toEqual([
      ['s1', 5],
      ['s2', 2],
    ]);
  });

  it('birden çok seviyeyi tarar ve her seviyenin kendi fiyatından işlem yapar', () => {
    const e = new MatchingEngine();
    e.submit(limit('s1', 'sell', 100, 3));
    e.submit(limit('s2', 'sell', 101, 3));
    e.submit(limit('s3', 'sell', 103, 3));
    const r = e.submit(limit('b1', 'buy', 102, 10));
    expect(r.trades.map((t) => [t.price, t.quantity])).toEqual([
      [100, 3],
      [101, 3],
    ]);
    expect(r.remainingQuantity).toBe(4);
    expect(e.bestBid()).toBe(102);
    expect(e.bestAsk()).toBe(103);
  });
});

describe('piyasa ve IOC emirleri', () => {
  it('piyasa emri mevcut en iyi fiyatlardan dolar', () => {
    const e = new MatchingEngine();
    e.submit(limit('s1', 'sell', 100, 5));
    e.submit(limit('s2', 'sell', 102, 5));
    const r = e.submit(market('b1', 'buy', 8));
    expect(r.status).toBe('filled');
    expect(r.trades.map((t) => [t.price, t.quantity])).toEqual([
      [100, 5],
      [102, 3],
    ]);
  });

  it('piyasa emri derinlik yetmezse kalanı iptal edilir, defterde beklemez', () => {
    const e = new MatchingEngine();
    e.submit(limit('s1', 'sell', 100, 5));
    const r = e.submit(market('b1', 'buy', 8));
    expect(r.status).toBe('partially_filled');
    expect(r.filledQuantity).toBe(5);
    expect(r.resting).toBe(false);
    expect(e.snapshot()).toEqual({ bids: [], asks: [] });
  });

  it('boş defterde piyasa emri iptal olur', () => {
    const e = new MatchingEngine();
    const r = e.submit(market('b1', 'buy', 5));
    expect(r.status).toBe('cancelled');
  });

  it('IOC limit emri kalanı bekletmez', () => {
    const e = new MatchingEngine();
    e.submit(limit('s1', 'sell', 100, 3));
    const r = e.submit({ ...limit('b1', 'buy', 100, 10), timeInForce: 'IOC' });
    expect(r.filledQuantity).toBe(3);
    expect(r.resting).toBe(false);
    expect(e.bestBid()).toBeUndefined();
  });
});

describe('iptal', () => {
  it('bekleyen emri iptal eder ve seviyeyi temizler', () => {
    const e = new MatchingEngine();
    e.submit(limit('b1', 'buy', 100, 5));
    expect(e.cancel('b1')).toBe(true);
    expect(e.snapshot().bids).toEqual([]);
  });

  it('olmayan veya dolmuş emri iptal edemez', () => {
    const e = new MatchingEngine();
    e.submit(limit('s1', 'sell', 100, 5));
    e.submit(limit('b1', 'buy', 100, 5));
    expect(e.cancel('s1')).toBe(false);
    expect(e.cancel('yok')).toBe(false);
  });

  it('seviyedeki diğer emirlerin önceliğini bozmaz', () => {
    const e = new MatchingEngine();
    e.submit(limit('s1', 'sell', 100, 2));
    e.submit(limit('s2', 'sell', 100, 2));
    e.submit(limit('s3', 'sell', 100, 2));
    e.cancel('s2');
    const r = e.submit(limit('b1', 'buy', 100, 4));
    expect(r.trades.map((t) => t.makerOrderId)).toEqual(['s1', 's3']);
  });
});

describe('doğrulama', () => {
  it.each([
    ['sıfır miktar', limit('x', 'buy', 100, 0)],
    ['ondalıklı miktar', limit('x', 'buy', 100, 1.5)],
    ['negatif fiyat', limit('x', 'buy', -1, 5)],
    ['limit emirde fiyat yok', { ...limit('x', 'buy', 100, 5), price: undefined }],
    ['piyasa emrinde fiyat var', { ...market('x', 'buy', 5), price: 100 }],
  ] as [string, NewOrder][])('%s reddedilir', (_ad, order) => {
    const r = new MatchingEngine().submit(order);
    expect(r.status).toBe('rejected');
    expect(r.reason).toBeTruthy();
  });

  it('aynı kimlikli bekleyen emri reddeder', () => {
    const e = new MatchingEngine();
    e.submit(limit('b1', 'buy', 100, 5));
    expect(e.submit(limit('b1', 'buy', 100, 5)).status).toBe('rejected');
  });
});

describe('invaryantlar (rastgele emir akışı)', () => {
  // Tohumlu sahte rastgele sayı üreteci: test tekrarlanabilir.
  const rng = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };

  it.each([1, 2, 3, 42, 2024])('tohum %i: defter asla kesişmez, miktar korunur', (seed) => {
    const rand = rng(seed);
    const e = new MatchingEngine();
    let submitted = 0;
    let traded = 0;
    const live: string[] = [];

    for (let i = 0; i < 2000; i++) {
      const roll = rand();
      if (roll < 0.15 && live.length > 0) {
        e.cancel(live.splice(Math.floor(rand() * live.length), 1)[0]!);
        continue;
      }
      const side: Side = rand() < 0.5 ? 'buy' : 'sell';
      const qty = 1 + Math.floor(rand() * 20);
      const order: NewOrder =
        roll < 0.25
          ? market(`o${i}`, side, qty)
          : limit(`o${i}`, side, 90 + Math.floor(rand() * 21), qty);
      const r = e.submit(order);
      submitted += qty;
      traded += r.trades.reduce((s, t) => s + t.quantity, 0);
      if (r.resting) live.push(order.id);

      const bid = e.bestBid();
      const ask = e.bestAsk();
      if (bid !== undefined && ask !== undefined) expect(bid).toBeLessThan(ask);
    }

    // Defterde kalan + iptal edilen + (2 x işlem hacmi) ≤ gönderilen; defter içi toplam tutarlı olmalı.
    const snap = e.snapshot();
    const resting = [...snap.bids, ...snap.asks].reduce((s, l) => s + l.quantity, 0);
    expect(resting + 2 * traded).toBeLessThanOrEqual(submitted);
    expect(resting).toBeGreaterThanOrEqual(0);
  });
});
