# Tahta: proje bağlamı (Claude için)

Sahibi bilgisayar mühendisliği öğrencisi. Amaç: finansal okuryazarlığı ve borsa becerilerini geliştiren, **portfolyoda "vay be" dedirtecek** bir oyun. Sadece çalışan değil, mühendislik açısından etkileyici olmalı. Kullanıcıyla Türkçe konuş.

## Kararlar
- Ad: **Tahta** (BIST'te emir defterine verilen ad). Repo: https://github.com/siracc35/tahta (public, hesap: siracc35)
- Oyun türü: geçmiş veri replay + sentetik piyasa simülasyonu, üstüne quiz/dersler ve senaryolar
- Piyasa: Borsa İstanbul + ABD karışık
- Mimari: pnpm monorepo, TypeScript. Backend **NestJS**, frontend React + Vite, PostgreSQL, Redis, WebSocket ile canlı fiyat, Docker Compose, GitHub Actions CI/CD
- Backend'siz/statik yaklaşım bilinçli olarak REDDEDİLDİ
- Portfolyo parçaları: eşleştirme motoru, olay tabanlı simülasyon, AI mentör (Claude API), liderlik tablosu, ADR'ler, OpenAPI, test, README diyagramları, canlı demo

## Durum
- [x] Monorepo iskeleti, README, ADR 0001
- [x] `packages/matching-engine`: limit/piyasa, GTC/IOC, kısmi dolum, iptal, snapshot, 25 test geçiyor
- [ ] **SIRADAKİ: `apps/api`** (NestJS + PostgreSQL + Redis, Docker Compose), sonra auth, portföy, emir endpoint'leri motora bağlanacak
- [ ] Simülasyon motoru, web arayüzü, veri hattı (BIST `.IS` + ABD, Yahoo), AI mentör, liderlik, CI/CD, canlı yayın

## Bilinen eksikler (motor)
- İptal ve seviye içi sıra O(n) (seviye dizi); gerekirse bağlı listeye geçilecek
- Self-trade prevention yok

## Komutlar
`pnpm install` · `pnpm test` · `pnpm lint` · `pnpm build`

## Notlar
- Windows + PowerShell. pnpm 12: build script onayı `pnpm-workspace.yaml` içindeki `allowBuilds` ile verilir
- Fiyat ve miktar her yerde pozitif tam sayı (en küçük birim)
- Commit mesajlarına Co-Authored-By satırı eklenir
