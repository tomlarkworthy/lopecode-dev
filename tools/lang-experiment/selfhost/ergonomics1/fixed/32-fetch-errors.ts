type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const loadConfig = async (fetch: Fetch): Promise<Result<{ theme: string }>> => {
  try {
    const res = await fetch("https://example.test/missing.json");
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const x: unknown = await res.json();
    if (typeof x !== "object" || x === null || !("theme" in x)) return { ok: false, error: "no theme" };
    return { ok: true, value: { theme: String(x.theme) } };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};
const theme = (loadConfig: Result<{ theme: string }>) => (loadConfig.ok ? loadConfig.value.theme : "default");
const problem = (loadConfig: Result<{ theme: string }>) => (loadConfig.ok ? "" : loadConfig.error);
