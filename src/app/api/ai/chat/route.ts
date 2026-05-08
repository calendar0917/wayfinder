import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/config";
import { createClient, SYSTEM_PROMPT } from "@/lib/ai-provider";
import { toolDefinitions, executeTool } from "@/lib/ai-tools";
import { isAuthenticated } from "@/lib/auth";
import { gitCommit } from "@/lib/git";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MAX_ITERATIONS = 5;

export async function POST(request: NextRequest) {
  const config = readConfig();
  if (!(await isAuthenticated(config.settings.passwordHash))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createClient(config.settings);
  if (!client) {
    return NextResponse.json(
      { error: "AI not configured — set apiKey in settings" },
      { status: 400 }
    );
  }

  try {
    const { messages, systemPrompt } = await request.json();

    const allMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt || SYSTEM_PROMPT },
      ...(messages || []),
    ];

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
            const stream = await client.chat.completions.create({
              model: config.settings.aiModel,
              messages: allMessages,
              tools: toolDefinitions,
              stream: true,
            });

            let textContent = "";
            const toolCallBuffers = new Map<
              string,
              { name: string; args: string }
            >();

            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta;
              if (delta?.content) {
                textContent += delta.content;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "text", content: delta.content })}\n\n`
                  )
                );
              }
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (!tc.function) continue;
                  const id =
                    tc.id || `tc_${iteration}_${toolCallBuffers.size}`;
                  if (tc.function.name) {
                    toolCallBuffers.set(id, {
                      name: tc.function.name,
                      args: tc.function.arguments ?? "",
                    });
                  } else if (toolCallBuffers.has(id)) {
                    toolCallBuffers.get(id)!.args +=
                      tc.function.arguments ?? "";
                  }
                }
              }
              // Clear buffers on each finish_reason to handle edge cases
              const finishReason = chunk.choices[0]?.finish_reason;
              if (
                finishReason &&
                toolCallBuffers.size > 0 &&
                finishReason !== "tool_calls"
              ) {
                // Model stopped unexpectedly — flush remaining tool calls
                break;
              }
            }

            // No tool calls — done
            if (toolCallBuffers.size === 0) {
              allMessages.push({
                role: "assistant",
                content: textContent || null,
              });
              break;
            }

            // Add assistant message with tool_calls to conversation
            allMessages.push({
              role: "assistant",
              content: textContent || null,
              tool_calls: Array.from(toolCallBuffers.entries()).map(
                ([id, tc]) => ({
                  id,
                  type: "function" as const,
                  function: { name: tc.name, arguments: tc.args },
                })
              ),
            });

            // Execute tools server-side (atomic read-modify-write)
            const currentConfig = readConfig();
            let configModified = false;

            for (const [id, tc] of toolCallBuffers) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool_executing",
                    name: tc.name,
                  })}\n\n`
                )
              );

              let parsedArgs: Record<string, unknown> = {};
              try {
                parsedArgs = JSON.parse(tc.args || "{}");
              } catch {
                parsedArgs = {};
              }
              const result = executeTool(tc.name, parsedArgs, currentConfig);
              if (result.success) {
                configModified = true;
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool_result",
                    success: result.success,
                    result: result.result,
                  })}\n\n`
                )
              );

              allMessages.push({
                role: "tool",
                tool_call_id: id,
                content: JSON.stringify(result),
              });
            }

            if (configModified) {
              writeConfig(currentConfig);
              gitCommit("ai: multi-tool");
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "config_updated" })}\n\n`
                )
              );
            }
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
        } catch (e) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                content: e instanceof Error ? e.message : "Stream error",
              })}\n\n`
            )
          );
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI request failed" },
      { status: 500 }
    );
  }
}
