# Despliegue sin dominio propio

## Objetivo

Que cualquiera con link pueda ver la clasificacion desde su casa.

## Opcion recomendada

- Vercel para la web.
- Supabase para base de datos.
- Apify para resultados.
- Vercel Cron para sincronizacion.

El link seria parecido a:

`https://porra-mundial-2026.vercel.app`

No hace falta comprar dominio.

## Pasos

1. Subir este proyecto a GitHub.
2. Crear proyecto en Supabase.
3. Ejecutar `supabase/schema.sql`.
4. Opcional: ejecutar `supabase/seed.sql` para jugadores de prueba.
5. Crear proyecto en Vercel importando el repo.
6. Anadir variables de entorno de `.env.example`.
7. Crear cron para llamar a `/api/apify/sync`. El `vercel.json` incluido usa una frecuencia diaria compatible con planes sencillos.

## Seguridad

- La clasificacion puede ser publica.
- Las apuestas deben usar codigos privados por jugador.
- El endpoint de Apify debe protegerse con `CRON_SECRET`. Vercel lo envia como cabecera `Authorization: Bearer ...` cuando la variable existe en el proyecto.
- La service role key de Supabase solo debe estar en Vercel, nunca en el navegador.

## Resultados en directo

Para actualizaciones cada pocos minutos durante partidos, revisar `docs/automation.md`.
