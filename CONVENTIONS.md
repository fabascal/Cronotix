# Convenciones de Desarrollo - Cronotix

## Stack Tecnológico Obligatorio
- [cite_start]**Backend:** NestJS (Node.js) con TypeScript[cite: 156].
- [cite_start]**Frontend:** React + Vite + TypeScript + shadcn/ui + Tailwind CSS[cite: 156].
- [cite_start]**IA:** LangChain + LangGraph para la orquestación de agentes[cite: 156].
- [cite_start]**Base de Datos:** PostgreSQL con la extensión **pgvector** para búsqueda semántica[cite: 156].
- [cite_start]**Procesamiento:** Redis + BullMQ para colas de trabajos asíncronos (OCR y análisis)[cite: 156].

## Reglas de Codificación
1. [cite_start]**Modularidad:** El código debe dividirse en los módulos definidos (Ingest, Ocr, Agents, Skills, MCP, Billing, etc.)[cite: 158].
2. [cite_start]**Seguridad:** - Las credenciales de MCP externos deben guardarse cifradas con **AES-256**[cite: 116, 130].
   - [cite_start]La comunicación entre Portal B y Cronotix requiere **API Key** y **HTTPS**[cite: 41].
3. [cite_start]**Manejo de Precios:** Las tarifas de LLM (OpenAI, Gemini) **nunca** deben estar en el código (hardcoded); deben consultarse desde la tabla `provider_pricing`[cite: 49, 163].
4. [cite_start]**Optimización de Tokens:** Es obligatorio implementar **Chunking inteligente** y **Caché en Redis** (TTL 24h) para ahorrar costos[cite: 57, 63, 64].