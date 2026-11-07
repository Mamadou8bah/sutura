/** Live requests only. Never replay an uncertain operation or create sample data. */
export async function availabilityFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  init?.signal?.addEventListener("abort", cancel, { once: true });
  if (init?.signal?.aborted) controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<Response>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("Request timed out")); }, 60000);
  });
  let response: Response;
  try {
    response = await Promise.race([fetch(url, { ...init, signal: controller.signal }), deadline]);
  } catch {
    if (init?.signal?.aborted) throw new Error("Request cancelled.");
    const readOnly = ["GET", "HEAD"].includes((init?.method ?? "GET").toUpperCase());
    throw new Error(readOnly
      ? "Unable to connect to Sutura. Check your connection and try again."
      : "Could not confirm your request. Check its status before trying again.");
  } finally {
    if (timer) clearTimeout(timer);
    init?.signal?.removeEventListener("abort", cancel);
  }
  if (response.status >= 500) throw new Error("Service temporarily unavailable. Check the status of any submitted operation before trying again.");
  return response;
}
