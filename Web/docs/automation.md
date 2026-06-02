# Automatizacion de resultados

## Endpoint disponible

`POST /api/apify/sync`

Este endpoint:

1. Llama al actor de Apify configurado en `APIFY_LIVE_ACTOR`.
2. Normaliza partidos live/finalizados.
3. Guarda resultados en Supabase.
4. Recalcula clasificacion.

## Seguridad

El endpoint acepta:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`
- `?secret=<CRON_SECRET>` para pruebas puntuales.

## Vercel Cron

El archivo `vercel.json` deja un cron diario compatible con planes sencillos:

`0 8 * * *`

Para actualizaciones live durante partidos hay dos caminos:

- Usar Vercel Pro con cron mas frecuente.
- Usar Apify Scheduler o un servicio externo de cron que llame a `/api/apify/sync` cada pocos minutos durante partidos.

## Frecuencia recomendada durante el Mundial

- Durante partidos en directo: cada 2-5 minutos.
- Dias con partidos pero fuera del directo: cada 30-60 minutos.
- Dias sin partidos: una vez al dia.
