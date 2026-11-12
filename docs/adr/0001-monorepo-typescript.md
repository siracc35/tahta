# ADR 0001: TypeScript monorepo (pnpm workspaces)

**Durum:** Kabul edildi

## Bağlam
Web, API ve çekirdek oyun/borsa mantığı aynı tipleri paylaşmalı. Eşleştirme motoru framework'ten bağımsız, kolay test edilebilir olmalı.

## Karar
Tek repoda pnpm workspaces. Backend NestJS, frontend React. Eşleştirme motoru `packages/matching-engine` altında, bağımlılıksız saf TypeScript.

## Sonuçlar
- Paylaşılan tipler, tek CI hattı.
- Motor, API'den ayrı test edilip ileride ayrı servise taşınabilir.
