# SIGIA + Supabase

Proyecto: sigia-maiposalud (`mcktgdkzuyzeukdlsrpz`) / región São Paulo.

## Ya creado en la base real
- profiles
- incidents
- incident_comments
- incident_history
- knowledge_articles
- import_batches
- import_errors
- RLS habilitado en todas las tablas expuestas
- trigger de perfil al crear usuarios
- índices para consultas y relaciones

## Configuración local
Copia `.env.local.example` a `.env.local` y ejecuta `npm install`.

## Dataset real
`data_incidentes_normalizados.csv` contiene los 137 registros de la hoja Incidentes normalizados para el nuevo esquema.
No contiene datos demo.

## Criterio de estado inicial
El Excel original calcula Estado Final con una fórmula de Google Sheets incompatible con Excel. Para la migración inicial se deriva `resuelta` cuando Update contiene Solucionado / Incluido en update / Actualización de API; el resto queda `nueva`. El texto original de Update se conserva.
