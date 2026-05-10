import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig, withWriteLock, resolveEnvVar } from "@/lib/config";
import { configSchema } from "@/lib/config-schema";
import { createClient, SYSTEM_PROMPT } from "@/lib/ai-provider";
import { toolDefinitions, executeTool } from "@/lib/ai-tools";
import { gitCommit } from "@/lib/git";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/auth";
import { isPrivateUrl } from "@/lib/ssrf";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MAX_ITERATIONS = 5;
const MAX_HISTORY_MESSAGES = 40;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const config = readConfig();

  const client = createClient(config.settings);
  if (!client) {
    return NextResponse.json(
      { error: "AI not configured — set apiKey in settings" },
      { status: 400 }
    );
  }

  try {
    const { messages, systemPrompt } = await request.json();

    // Truncate old messages to keep context manageable
    const trimmedMessages = (messages || []).slice(-MAX_HISTORY_MESSAGES);

    const allMessages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${systemPrompt || SYSTEM_PROMPT}\n\nCurrent config: ${JSON.stringify({
          title: config.settings.title,
          theme: config.settings.theme,
          locale: config.settings.locale,
          layout: config.settings.layout,
          customCss: config.settings.customCss ? `(${config.settings.customCss.length} chars)` : undefined,
          widgets: config.widgets.map((w, i) => ({ index: i, type: w.type, config: w.config })),
          groups: config.groups.map(g => ({
            name: g.name,
            bookmarks: g.bookmarks?.map(b => b.name) || [],
            subgroups: g.groups?.map(sg => sg.name) || [],
          })),
          pages: config.pages?.map(p => ({ name: p.name, groups: p.groups })),
        })}`,
      },
      ...trimmedMessages,
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
            const toolCallByIndex = new Map<
              number,
              { id: string; name: string; args: string }
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
                  const idx = tc.index ?? 0;
                  if (!toolCallByIndex.has(idx)) {
                    toolCallByIndex.set(idx, {
                      id: tc.id || `tc_${iteration}_${idx}`,
                      name: tc.function.name || "",
                      args: tc.function.arguments ?? "",
                    });
                  } else {
                    const buf = toolCallByIndex.get(idx)!;
                    if (tc.id) buf.id = tc.id;
                    if (tc.function.name) buf.name = tc.function.name;
                    buf.args += tc.function.arguments ?? "";
                  }
                }
              }
              const finishReason = chunk.choices[0]?.finish_reason;
              if (
                finishReason &&
                toolCallByIndex.size > 0 &&
                finishReason !== "tool_calls"
              ) {
                break;
              }
            }

            // Convert index-based buffers to ID-based map for consistent downstream handling
            const toolCallBuffers = new Map<string, { name: string; args: string }>();
            for (const buf of toolCallByIndex.values()) {
              toolCallBuffers.set(buf.id, { name: buf.name, args: buf.args });
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
            const pendingResults: Array<{
              id: string;
              name: string;
              aiContent: string;
              clientResult: string;
              clientSuccess: boolean;
            }> = [];

            for (const [id, tc] of toolCallBuffers) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool_executing",
                    id,
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

              // Handle set_password: hash the sentinel value before persisting
              if (
                tc.name === "set_password" &&
                result.success &&
                result.config.settings.passwordHash.startsWith("HASH:")
              ) {
                const plain = result.config.settings.passwordHash.slice(5);
                result.config.settings.passwordHash = await hashPassword(plain);
              }

              // Handle reload_config: use the fresh config from result
              if (tc.name === "reload_config" && result.success) {
                Object.assign(currentConfig, result.config);
              }

              // Handle probe_endpoint: fetch the real API (SSRF-protected)
              if (result.success && typeof result.result === "string" && result.result.startsWith("__PROBE__")) {
                const probeData = JSON.parse(result.result.slice("__PROBE__".length));

                // SSRF check — block internal network addresses
                if (isPrivateUrl(probeData.endpoint)) {
                  result.success = false;
                  result.result = "Probe blocked: cannot access private/internal network addresses";
                } else {
                  try {
                    const probeUrl = new URL(probeData.endpoint);
                    if (!["http:", "https:"].includes(probeUrl.protocol)) throw new Error("Only HTTP(S) allowed");
                    const probeHeaders: Record<string, string> = {
                      "User-Agent": "HomepageDashboard/1.0 IntegrationProbe",
                      "Accept": "application/json",
                    };
                    if (probeData.headers) {
                      for (const [k, v] of Object.entries(probeData.headers as Record<string, string>)) {
                        const resolved = resolveEnvVar(v);
                        probeHeaders[k] = typeof resolved === "string" ? resolved : v;
                      }
                    }
                    const ac = new AbortController();
                    const timeout = setTimeout(() => ac.abort(), 10000);
                    const probeRes = await fetch(probeUrl.toString(), {
                      signal: ac.signal,
                      headers: probeHeaders,
                    });
                    clearTimeout(timeout);
                    if (!probeRes.ok) {
                      result.result = `Probe failed: HTTP ${probeRes.status}`;
                    } else {
                      const rawData = await probeRes.json();
                      const jsonStr = JSON.stringify(rawData, null, 2);
                      const truncated = jsonStr.length > 2000
                        ? jsonStr.slice(0, 2000) + "\n... (truncated)"
                        : jsonStr;
                      result.result = `Probe result for ${probeData.endpoint}:\n${truncated}`;
                    }
                  } catch (e) {
                    result.result = `Probe error: ${e instanceof Error ? e.message : "Request failed"}`;
                  }
                }
              }

              const isReadOnly = tc.name === "probe_endpoint" || tc.name === "list_templates" || tc.name === "list_env_vars" || tc.name === "reload_config";
              if (result.success && !isReadOnly) {
                configModified = true;
              }

              // Prepare results: full JSON for AI context, sanitized for client display
              let clientResult: string = typeof result.result === "string" ? result.result : String(result.result);
              if (tc.name === "probe_endpoint" && result.success) {
                clientResult = "API structure discovered — use configure_integration to set up fields";
              }

              pendingResults.push({
                id,
                name: tc.name,
                aiContent: JSON.stringify(result),
                clientResult,
                clientSuccess: result.success,
              });
            }

            // Validate and persist config before confirming tool results
            if (configModified) {
              const validation = configSchema.safeParse(currentConfig);
              if (!validation.success) {
                const issues = validation.error.issues.map(
                  (i) => `${i.path.join(".")}: ${i.message}`
                );
                // Rollback tool results — mark all config-modifying tools as failed
                for (const pr of pendingResults) {
                  if (pr.clientSuccess) {
                    pr.clientSuccess = false;
                    pr.clientResult = "Config validation failed — changes rolled back";
                    pr.aiContent = JSON.stringify({ success: false, result: "Config validation failed — changes rolled back" });
                  }
                }
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "error",
                      content: `Config validation failed: ${issues.join("; ")}`,
                    })}\n\n`
                  )
                );
              } else {
                await withWriteLock(() => {
                  writeConfig(currentConfig);
                });
                gitCommit("ai: multi-tool");
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "config_updated" })}\n\n`
                  )
                );
              }
            }

            // Send tool results to client and AI (after validation to report correct status)
            for (const pr of pendingResults) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool_result",
                    id: pr.id,
                    success: pr.clientSuccess,
                    result: pr.clientResult,
                  })}\n\n`
                )
              );
              allMessages.push({
                role: "tool",
                tool_call_id: pr.id,
                content: pr.aiContent,
              });
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
