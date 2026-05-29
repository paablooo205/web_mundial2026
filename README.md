# Porra Mundial 2026

Mini web publica para gestionar una porra del Mundial 2026 con:

- Clasificacion publica por link.
- Formulario privado por codigo para cada jugador.
- Panel admin simple.
- Base de datos Supabase.
- Automatizacion de resultados con Apify/FlashScore.
- Motor de puntuacion propio.
- Mapeo preparado para exportar al Excel admin de 7 jugadores.

## Stack

- Next.js App Router
- TypeScript
- Supabase Postgres
- Apify API
- Vercel para despliegue

## Primer arranque local

```powershell
npm install
copy .env.example .env.local
npm run dev
```

## Despliegue recomendado

1. Crear proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL editor.
3. Crear proyecto en Vercel conectado a este repositorio.
4. Configurar variables de entorno.
5. Crear un cron en Vercel para llamar a `/api/apify/sync`.

## Rutas

- `/clasificacion`: clasificacion publica.
- `/predicciones/[codigo]`: formulario de apuestas de cada jugador.
- `/admin`: panel admin sencillo.
- `/api/apify/sync`: sincronizacion protegida para resultados.
