// ────────────────────────────────────────────────────────────────
// ⚠️  CLAUDIA AI AGENT — STUB ONLY
// ────────────────────────────────────────────────────────────────
// DO NOT install @anthropic-ai/sdk here.
// DO NOT reference ANTHROPIC_API_KEY in this file.
// This stub returns realistic mock responses so the frontend
// works completely during development and demo.
//
// TO ADD THE REAL CLAUDIA INTEGRATION LATER:
// 1. npm install @anthropic-ai/sdk
// 2. Add ANTHROPIC_API_KEY to .env.local
// 3. Replace the mock handler below with real Anthropic streaming
// 4. The tool definitions, knowledge base, and audit logging
//    are already wired up correctly — only the AI call changes
// ────────────────────────────────────────────────────────────────
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { writeAuditEntry } from '../lib/hash-chain';
import { findProcedure, detectEventType, OFFICES, } from '../lib/knowledge-base';
export const claudiaRoute = new Hono();
function handleToolCall(toolName, input) {
    switch (toolName) {
        case 'handle_life_event': {
            const procedure = findProcedure(input.event_type);
            if (!procedure) {
                return {
                    type: 'text_only',
                    message: 'Nu am informații despre acest eveniment încă.',
                };
            }
            return { type: 'action_plan', procedure };
        }
        case 'find_office_info': {
            const office = OFFICES[input.office_type];
            if (!office)
                return { type: 'text_only', message: 'Birou negăsit.' };
            return { type: 'office_info', office, office_type: input.office_type };
        }
        case 'generate_pdf': {
            return { type: 'pdf_ready', form_type: input.form_type };
        }
        case 'set_reminder': {
            return {
                type: 'reminder_set',
                title: input.title,
                deadline_days: Number(input.deadline_days),
                category: input.category,
            };
        }
        default:
            return { type: 'text_only', message: '' };
    }
}
function getMockResponse(lastMessage) {
    const eventType = detectEventType(lastMessage);
    if (eventType) {
        const procedure = findProcedure(eventType);
        return {
            text: procedure
                ? `Am înțeles! ${procedure.title}. Iată planul tău:`
                : 'Te pot ajuta cu asta. Iată ce trebuie să faci:',
            tool: 'handle_life_event',
            tool_input: { event_type: eventType },
        };
    }
    const msg = lastMessage.toLowerCase();
    if (msg.includes('dgep') || msg.includes('evidență')) {
        return {
            text: 'Iată informațiile despre DGEP Cluj:',
            tool: 'find_office_info',
            tool_input: { office_type: 'dgep' },
        };
    }
    if (msg.includes('primărie') ||
        msg.includes('primarie') ||
        msg.includes('impozit')) {
        return {
            text: 'Informații despre Primăria Cluj:',
            tool: 'find_office_info',
            tool_input: { office_type: 'primarie' },
        };
    }
    if (msg.includes('formular') ||
        msg.includes('pdf') ||
        msg.includes('descarcă')) {
        return {
            text: 'Pot genera formularul pre-completat cu datele tale:',
            tool: 'generate_pdf',
            tool_input: { form_type: 'viza_flotant' },
        };
    }
    return {
        text: 'Bună! Sunt ClaudIA, asistentul tău civic. Descrie situația ta — de exemplu "mi-am cumpărat o mașină" sau "mă mut la Cluj" — și îți ofer un plan complet cu toți pașii necesari. (Notă: aceasta este o versiune demo — integrarea AI completă va fi adăugată de echipa de backend.)',
        tool: null,
        tool_input: null,
    };
}
claudiaRoute.post('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ success: false, error: 'Request body invalid' }, 400);
    }
    const { messages } = body;
    if (!messages || messages.length === 0) {
        return c.json({ success: false, error: 'Mesajele lipsesc' }, 400);
    }
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content ?? '';
    writeAuditEntry({
        userId,
        action: `Sesiune ClaudIA — mesaj: "${lastUserMessage.substring(0, 60)}..."`,
        actionType: 'chat_session',
        data: { message_count: messages.length },
    });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            await new Promise((resolve) => setTimeout(resolve, 900));
            const mock = getMockResponse(lastUserMessage);
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'text', content: mock.text }) + '\n'));
            if (mock.tool && mock.tool_input) {
                const toolResult = handleToolCall(mock.tool, mock.tool_input);
                controller.enqueue(encoder.encode(JSON.stringify({
                    type: 'tool_result',
                    tool_name: mock.tool,
                    result: toolResult,
                }) + '\n'));
            }
            controller.close();
        },
    });
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
});
