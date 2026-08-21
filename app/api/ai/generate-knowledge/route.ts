import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY no configurada" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const incident = body?.incident

    if (!incident) {
      return NextResponse.json(
        { error: "Incidencia no enviada" },
        { status: 400 }
      )
    }

    const prompt = `
Eres SIG-IA, asistente de documentación técnica de incidencias.

Debes transformar una incidencia resuelta en un artículo reutilizable
para una Base de Conocimiento.

REGLAS:
- No inventes información.
- Usa solamente los datos entregados.
- Si una causa no está confirmada, indícalo de forma prudente.
- La solución debe quedar clara y reutilizable.
- Evita lenguaje informal.
- No menciones nombres de personas salvo que sea estrictamente necesario.
- El artículo debe ser útil para resolver casos similares futuros.
- Responde exclusivamente JSON válido.

INCIDENCIA:

Código:
${incident.id || ""}

Título:
${incident.title || ""}

Descripción:
${incident.description || ""}

Módulo:
${incident.category || ""}

Departamento:
${incident.department || ""}

Origen:
${incident.origin || ""}

Motivo / Causa:
${incident.reason || ""}

Estrategia / Solución aplicada:
${incident.strategy || ""}

Seguimiento:
${incident.followUp || ""}

Sistema / Producto:
${incident.systemProduct || ""}

Proveedor externo:
${incident.externalProvider || ""}

Devuelve exactamente:

{
  "title": "",
  "category": "",
  "problem": "",
  "symptoms": "",
  "causes": "",
  "procedure": "",
  "validation": "",
  "notes": ""
}
`

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          temperature: 0.15,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content:
                "Eres SIG-IA. Documentas soluciones técnicas a partir de incidencias resueltas y respondes solamente JSON válido.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()

      console.error(
        "Groq generate knowledge error:",
        response.status,
        errorText
      )

      return NextResponse.json(
        {
          error:
            "SIG-IA no pudo generar el artículo de conocimiento.",
        },
        { status: 502 }
      )
    }

    const result = await response.json()

    const content =
      result?.choices?.[0]?.message?.content

    if (!content) {
      throw new Error(
        "Groq no devolvió contenido"
      )
    }

    const article = JSON.parse(content)

    return NextResponse.json({
      success: true,
      article: {
        title: String(
          article.title ||
            incident.title ||
            "Artículo de conocimiento"
        ),

        category: String(
          article.category ||
            incident.category ||
            "Otro"
        ),

        problem: String(
          article.problem ||
            incident.description ||
            incident.title ||
            ""
        ),

        symptoms: String(
          article.symptoms || ""
        ),

        causes: String(
          article.causes ||
            incident.reason ||
            ""
        ),

        procedure: String(
          article.procedure ||
            incident.strategy ||
            ""
        ),

        validation: String(
          article.validation ||
            incident.followUp ||
            ""
        ),

        notes: String(
          article.notes ||
            `Generado automáticamente desde ${incident.id || "incidencia resuelta"}`
        ),
      },
    })
  } catch (error) {
    console.error(
      "SIG-IA generate knowledge error:",
      error
    )

    return NextResponse.json(
      {
        error:
          "No se pudo generar el artículo de conocimiento.",
      },
      { status: 500 }
    )
  }
}