# WhatsApp → SIGIA

SIGIA recibe incidencias mediante la Edge Function `whatsapp-ingest`.

## Endpoint

`https://mcktgdkzuyzeukdlsrpz.supabase.co/functions/v1/whatsapp-ingest`

## Autenticación

Enviar el header `x-sigia-key`. Mantener esta clave solamente en el `.env` del bot, nunca en código frontend ni Git.

## Payload mínimo

```json
{
  "messageId": "ID_UNICO_DE_WHATSAPP",
  "text": "El tótem de Talagante no genera bono electrónico"
}
```

## Payload recomendado

```json
{
  "messageId": "ID_UNICO_DE_WHATSAPP",
  "groupId": "120363...@g.us",
  "sender": "569...@c.us",
  "senderName": "Nombre",
  "messageType": "text",
  "text": "El tótem de Talagante no genera bono electrónico",
  "title": "Tótem no genera bono electrónico",
  "module": "Tótem",
  "systemProduct": "Mobius",
  "department": "GTI",
  "priority": "alta",
  "location": "Talagante"
}
```

La API genera el código `INxxx`, aplica responsable conocido, SLA y anti-duplicado por `messageId`.

## Respuesta

```json
{
  "success": true,
  "duplicate": false,
  "code": "IN140",
  "status": "nueva"
}
```

Si el mismo `messageId` se reenvía, devuelve el folio existente y `duplicate: true`.

## Node.js / bot

```js
async function crearIncidenciaSigia(incidencia) {
  const response = await fetch(process.env.SIGIA_INGEST_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sigia-key': process.env.SIGIA_INGEST_KEY,
    },
    body: JSON.stringify(incidencia),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `SIGIA HTTP ${response.status}`)
  return data
}
```

Variables del bot:

```env
SIGIA_INGEST_URL=https://mcktgdkzuyzeukdlsrpz.supabase.co/functions/v1/whatsapp-ingest
SIGIA_INGEST_KEY=REEMPLAZAR_CON_LA_CLAVE_ENTREGADA
```

No poner `SIGIA_INGEST_KEY` en variables `NEXT_PUBLIC_*`.
