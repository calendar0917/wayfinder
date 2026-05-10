export interface ProbeResult {
  status: "up" | "down" | "error";
  responseTime: number;
  statusCode: number;
}

export async function probeUrl(url: string): Promise<ProbeResult> {
  const start = Date.now();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { status: "error", responseTime: Date.now() - start, statusCode: 0 };
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { status: "error", responseTime: Date.now() - start, statusCode: 0 };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "HomepageDashboard/1.0 StatusCheck" },
    });
    clearTimeout(timeout);
    return {
      status: response.ok ? "up" : "down",
      responseTime: Date.now() - start,
      statusCode: response.status,
    };
  } catch {
    clearTimeout(timeout);
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 5000);
    try {
      const response = await fetch(parsedUrl.toString(), {
        method: "GET",
        signal: controller2.signal,
        redirect: "follow",
        headers: { "User-Agent": "HomepageDashboard/1.0 StatusCheck" },
      });
      clearTimeout(timeout2);
      return {
        status: response.ok ? "up" : "down",
        responseTime: Date.now() - start,
        statusCode: response.status,
      };
    } catch {
      clearTimeout(timeout2);
      return {
        status: "error",
        responseTime: Date.now() - start,
        statusCode: 0,
      };
    }
  }
}

export async function probeUrlsConcurrently(
  urls: string[],
  maxConcurrent = 5
): Promise<Record<string, ProbeResult>> {
  const results: Record<string, ProbeResult> = {};
  let running = 0;
  let index = 0;

  await new Promise<void>((resolve) => {
    function processNext() {
      while (running < maxConcurrent && index < urls.length) {
        const url = urls[index++];
        running++;
        probeUrl(url).then((result) => {
          results[url] = result;
          running--;
          if (index >= urls.length && running === 0) {
            resolve();
          } else {
            processNext();
          }
        });
      }
      if (index >= urls.length && running === 0) {
        resolve();
      }
    }
    processNext();
  });

  return results;
}
