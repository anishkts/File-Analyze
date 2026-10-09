import { NextRequest } from 'next/server';
import {
  getDocument,
  createChatSession,
  getChatSession,
  insertChatMessage,
  getChatMessages,
} from '@/lib/db';
import { createContractTools } from '@/lib/agent/tools';
import { getAiModel, formatSystemPrompt, runOfflineSimulatedResearch } from '@/lib/agent/orchestrator';
import { extractQuotesFromText, verifyQuote } from '@/lib/verification/verifier';
import { streamText } from 'ai';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId: inputSessionId,
      documentIds,
      message,
    } = body as {
      sessionId?: string;
      documentIds: string[];
      message: string;
    };

    if (!documentIds || documentIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No documents selected' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!message || !message.trim()) {
      return new Response(JSON.stringify({ error: 'Message cannot be empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Session resolution
    let sessionId = inputSessionId;
    if (!sessionId || !getChatSession(sessionId)) {
      sessionId = `sess-${crypto.randomUUID()}`;
      createChatSession({
        id: sessionId,
        documentIds,
        title: message.slice(0, 40) + (message.length > 40 ? '...' : ''),
      });
    }

    // Record user message
    const userMsgId = `msg-${crypto.randomUUID()}`;
    insertChatMessage({
      id: userMsgId,
      sessionId,
      role: 'user',
      content: message,
    });

    // 2. Fetch documents
    const docs = documentIds.map((id) => getDocument(id)).filter(Boolean) as any[];
    const docSummaries = docs.map(
      (d) => `Document ID: "${d.id}" | Name: "${d.filename}" | Pages: ${d.pageCount}`
    );

    const model = getAiModel();
    const encoder = new TextEncoder();

    // 3. Fallback to offline agent research if no API key is provided
    if (!model) {
      const stream = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'session', sessionId })}\n\n`
              )
            );

            const result = await runOfflineSimulatedResearch(
              message,
              documentIds,
              (status) => {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'status', status })}\n\n`
                  )
                );
              }
            );

            for (const step of result.steps) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'step', step })}\n\n`
                )
              );
            }

            // Stream text chunk by chunk for realistic streaming experience
            const words = result.content.split(' ');
            for (let i = 0; i < words.length; i++) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'token',
                    text: words[i] + (i === words.length - 1 ? '' : ' '),
                  })}\n\n`
                )
              );
              await new Promise((r) => setTimeout(r, 20));
            }

            // Send verified quotes
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'quotes',
                  quotes: result.quotes,
                  coverage: result.coverage,
                })}\n\n`
              )
            );

            // Save assistant message to DB
            const assistantMsgId = `msg-${crypto.randomUUID()}`;
            insertChatMessage({
              id: assistantMsgId,
              sessionId,
              role: 'assistant',
              content: result.content,
              toolCalls: result.steps,
              quotes: result.quotes,
            });

            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (err: any) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // 4. Live Agentic Tool-Calling Stream using Vercel AI SDK
    const tools = createContractTools(documentIds);
    const history = getChatMessages(sessionId);
    const formattedMessages = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = formatSystemPrompt(docSummaries);
    const accumulatedSteps: any[] = [];
    let fullResponseText = '';

    const aiStream = streamText({
      model,
      system: systemPrompt,
      messages: formattedMessages,
      tools,
      maxSteps: 6, // Hard round cap requirement
    });

    const responseStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'session', sessionId })}\n\n`
          )
        );

        try {
          for await (const part of aiStream.fullStream) {
            if (part.type === 'text-delta') {
              fullResponseText += part.textDelta;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'token', text: part.textDelta })}\n\n`
                )
              );
            } else if (part.type === 'tool-call') {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'status',
                    status: `Researching: executing ${part.toolName}...`,
                  })}\n\n`
                )
              );
            } else if (part.type === 'tool-result') {
              const step = {
                toolName: part.toolName,
                args: part.args,
                statusText: `Executed ${part.toolName}`,
                timestamp: new Date().toISOString(),
              };
              accumulatedSteps.push(step);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'step', step })}\n\n`
                )
              );
            } else if (part.type === 'error') {
              console.error('aiStream fullStream error part:', part.error);
              throw part.error;
            }
          }

          // 5. Verification Pass on all cited quotes
          const rawQuotes = extractQuotesFromText(fullResponseText);
          const verifiedQuotes: any[] = [];

          for (const q of rawQuotes) {
            let matched = false;
            for (const doc of docs) {
              const res = verifyQuote(doc.extractedText, q, [], doc.id);
              if (res.verified) {
                verifiedQuotes.push({
                  ...res,
                  documentName: doc.filename,
                });
                matched = true;
                break;
              }
            }

            if (!matched) {
              verifiedQuotes.push({
                quote: q,
                verified: false,
                reason: 'Unverified: quote was not found in any selected contract.',
              });
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'quotes',
                quotes: verifiedQuotes,
              })}\n\n`
            )
          );

          // Save assistant message to DB
          const assistantMsgId = `msg-${crypto.randomUUID()}`;
          insertChatMessage({
            id: assistantMsgId,
            sessionId,
            role: 'assistant',
            content: fullResponseText,
            toolCalls: accumulatedSteps,
            quotes: verifiedQuotes,
          });

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (streamErr: any) {
          console.error('Streaming error:', streamErr);
          // If partial response was generated, save it
          if (fullResponseText.trim()) {
            const partialId = `msg-${crypto.randomUUID()}`;
            insertChatMessage({
              id: partialId,
              sessionId,
              role: 'assistant',
              content: fullResponseText,
              toolCalls: accumulatedSteps,
            });
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'token',
                text: `\n\n⚠️ **Error during research**: ${streamErr?.message || 'Unable to complete response'}`,
              })}\n\n`
            )
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages = getChatMessages(sessionId);
  return new Response(JSON.stringify({ messages }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
