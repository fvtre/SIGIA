import { NextResponse } from "next/server"

export const runtime = "nodejs"

type HistoricalCase = {
  title?: string
  category?: string
  problem?: string
  causes?: string
  procedure?: string
  validation?: string
  source_incident_code?: string
  similarity_percent?: number
}

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
    const incident = String(body?.incident || "").trim()
    const historicalCases: HistoricalCase[] = Array.isArray(body?.historicalCases)
      ? body.historicalCases.slice(0, 3)
      : []

    if (incident.length < 8) {
      return NextResponse.json(
        { error: "La incidencia es demasiado corta para analizar." },
        { status: 400 }
      )
    }

    const evidence = historicalCases
      .map(
        (item, index) => `
CASO ${index + 1}
Código: ${item.source_incident_code || "Sin código"}
Similitud textual: ${item.similarity_percent ?? 0}%
Módulo: ${item.category || "No informado"}
Problema: ${item.problem || item.title || "No informado"}
Causa: ${item.causes || "No informada"}
Solución: ${item.procedure || "No informada"}
Validación: ${item.validation || "No informada"}
`
      )
      .join("\n")

    const prompt = `
Eres SIG-IA, el asistente inteligente de análisis de incidencias de SIGIA.

Analiza la incidencia nueva utilizando principalmente los casos históricos entregados por SIGIA.

REGLAS:
- No inventes antecedentes.
- No afirmes una causa como segura si la evidencia no lo permite.
- Prioriza soluciones que ya fueron utilizadas en casos históricos.
- Si la evidencia es insuficiente, indícalo claramente.
- La confianza debe ser un número entre 0 y 100.
- Responde exclusivamente JSON válido.

INCIDENCIA NUEVA:
${incident}

CASOS HISTÓRICOS:
${evidence || "No se encontraron casos históricos suficientemente similares."}

Devuelve exactamente esta estructura:
{
  "confidence": 0,
  "probable_module": "",
  "probable_area": "",
  "probable_cause": "",
  "recommended_solution": "",
  "explanation": "",
  "related_incident": ""
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
                "Eres SIG-IA. Analizas incidencias de soporte utilizando evidencia histórica y respondes únicamente JSON válido.",
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
      console.error("Groq error:", response.status, errorText)

      return NextResponse.json(
        {
          error: "SIG-IA no pudo completar el análisis.",
          provider_status: response.status,
        },
        { status: 502 }
      )
    }

    const result = await response.json()
    const content = result?.choices?.[0]?.message?.content

    if (!content) {
      throw new Error("Groq no devolvió contenido")
    }

    const analysis = JSON.parse(content)

    return NextResponse.json({
      success: true,
      analysis: {
        confidence: Math.max(0, Math.min(100, Number(analysis.confidence) || 0)),
        probable_module: String(analysis.probable_module || ""),
        probable_area: String(analysis.probable_area || ""),
        probable_cause: String(analysis.probable_cause || ""),
        recommended_solution: String(analysis.recommended_solution || ""),
        explanation: String(analysis.explanation || ""),
        related_incident: String(analysis.related_incident || ""),
      },
    })
  } catch (error) {
    console.error("SIG-IA error:", error)

    return NextResponse.json(
      { error: "No se pudo analizar la incidencia." },
      { status: 500 }
    )
  }
}
