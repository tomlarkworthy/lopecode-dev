type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const loadConfig = async (fetch: Fetch): Promise<Result<{ theme: string }>> => {
  try {
    const res = await fetch("https://example.test/missing.json");
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, value: await res.json() };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};
const theme = (loadConfig: Result<{ theme: string }>) => (loadConfig.ok ? loadConfig.value.theme : "default");
const problem = (loadConfig: Result<{ theme: string }>) => (loadConfig.ok ? "" : loadConfig.error);
