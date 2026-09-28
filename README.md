# SkinBox demo

Node/Express demo: cases, server-side weighted RNG, inventory, upgrade, login and TEST MODE admin odds.

Run: `npm install` then `npm start`.
Demo user: `demo / demo`. Admin: `admin / change-me`.

Цены: Skinport API (резерв — market.csgo.com), обновление каждые 10 мин, кэш в `market-cache.json`.
Картинки: Steam CDN (ссылки из ByMykel CSGO-API, резерв — поиск Steam Market). Если API недоступен — берутся цены из data.json и заглушка вместо картинки.
Проверить статус: `GET /api/prices`.

Виртуальный баланс, реальные деньги не используются. Изменение шансов — только тестовый режим, журналируется.
