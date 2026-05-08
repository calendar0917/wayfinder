export async function mutate(
  operation: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result?: string; config?: unknown } | null> {
  const res = await fetch("/api/config/mutate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, arguments: args }),
  });
  if (res.status === 401) {
    window.dispatchEvent(new Event("auth-required"));
    return null;
  }
  return res.json();
}
