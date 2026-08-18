# SIGIA — Gestión Inteligente de Incidencias

Versión funcional de demostración construida sobre el prototipo generado por v0.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir: http://localhost:3000

Credenciales demo precargadas:
- Correo: adriano.lecaros@sigia.io
- Contraseña: demo1234

## Funcionalidades incluidas

- Login demo y recuperación simulada.
- Dashboard con KPI calculados desde las incidencias persistidas.
- Listado de incidencias con búsqueda y filtros.
- Vista tabla/Kanban.
- Crear incidencias.
- Clasificación SIGIA AI local por reglas.
- Detalle editable de incidencia.
- Cambio de estado y prioridad.
- Asignación de responsable.
- Comentarios e historial.
- Seguimiento SLA.
- Mis asignaciones.
- Base de conocimiento con búsqueda.
- Reportes y exportación CSV.
- Administración de usuarios.
- Configuración y restauración de datos demo.
- Persistencia en localStorage: los cambios sobreviven al recargar la página.
- Modo claro/oscuro y diseño responsive heredado del prototipo.

## Importante para producción

Esta versión funciona como aplicación local/demo sin infraestructura externa. Para uso real multiusuario en MaipoSalud se recomienda reemplazar localStorage por Supabase/PostgreSQL, implementar autenticación real, almacenamiento de adjuntos, permisos RBAC en servidor, auditoría persistente y conectar SIGIA AI a un proveedor de IA mediante API segura.

## Flujo real Supabase
1. Ejecuta `npm install` y `npm run dev`.
2. En la portada pulsa **Crear cuenta**. La primera cuenta registrada queda como Administrador.
3. Inicia sesión.
4. Abre **Importar datos** en el menú y pulsa **Importar 137 incidencias reales**.
5. Dashboard, Incidencias, SLA y Reportes leerán PostgreSQL/Supabase.

La importación usa `code` (INxxx) como clave única y hace upsert, por lo que no duplica registros. La fila original se conserva en `source_data` JSONB.


## Integración WhatsApp

Ver `docs/WHATSAPP_INTEGRATION.md`. El listado/Kanban escucha cambios de `incidents` por Supabase Realtime.
