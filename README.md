# Life Elo

Personal habit & wellbeing PWA. See `LIFE_ELO_PRODUCT_CONTEXT.md` and `CLAUDE.md`.

Local-first PWA: data lives in IndexedDB and works offline. An optional account (Supabase: email+password or
Google) syncs raw records (reviews, wellbeing, profile) between devices; rating is always recomputed locally.
Language and theme are per device.

```sh
npm install
npm run dev   # also reachable from a phone on the same Wi-Fi
npm test
```

## Деплой и установка на iPhone

1. На vercel.com: Add New, Project, импортируйте репозиторий из GitHub (Framework Preset: Vite).
2. Добавьте переменные окружения `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` (нужны при сборке; после
   изменения сделайте Redeploy). Подробности: `docs/setup/backend.md`, раздел 8.
3. Каждый push в `main` деплоится автоматически.
4. Откройте адрес Vercel в Safari на iPhone, Поделиться, «На экран „Домой“».

Ссылка для сброса пароля из письма открывается в Safari (отдельно от установленного приложения): задайте
новый пароль там, затем войдите уже в приложении.
