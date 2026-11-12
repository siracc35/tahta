# Tahta

Borsa İstanbul ve ABD piyasaları üzerinde, finansal okuryazarlığı oyunla öğreten bir simülasyon platformu.

> "Tahta", BIST'te emir defterine verilen addır.

## Mimari (hedef)

```
Web (React + TS) ──REST/WebSocket──► API (NestJS)
                                      ├─ auth, portföy, liderlik
                                      ├─ emir eşleştirme motoru (packages/matching-engine)
                                      ├─ simülasyon motoru
                                      └─ AI mentör
                                  PostgreSQL · Redis
                    Veri hattı (ETL): geçmiş fiyatlar → DB
```

## Yapı

| Yol | Açıklama |
| --- | --- |
| `packages/matching-engine` | Saf TypeScript emir eşleştirme motoru (fiyat-zaman önceliği) |
| `apps/api` | NestJS backend (yakında) |
| `apps/web` | React arayüz (yakında) |
| `docs/adr` | Mimari karar kayıtları |

## Yol haritası

- [x] Monorepo iskeleti
- [x] Emir eşleştirme motoru + testler
- [ ] API: auth, portföy, emirler
- [ ] Simülasyon motoru (geçmiş replay + sentetik piyasa)
- [ ] Web arayüzü, canlı fiyat akışı (WebSocket)
- [ ] Veri hattı (BIST + ABD)
- [ ] AI mentör, liderlik tablosu
- [ ] Docker Compose, CI/CD, canlı yayın
