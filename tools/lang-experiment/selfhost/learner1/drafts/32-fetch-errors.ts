type Config = { readonly theme: string };
type Loaded = { readonly ok: true; readonly value: Config } | { readonly ok: false; readonly error: string };

const loadConfig = async (fetch: Fetch): Promise<Loaded> => {
  try {
    const res = await fetch("https://example.test/missing.json");
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const r = cast<Config>(await res.json());
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, value: r.value };
  } catch (e) {
    return { ok: false, error: messageOf(e) };
  }
};

const theme = (loadConfig: Loaded) => (loadConfig.ok ? loadConfig.value.theme : "default");

const problem = (loadConfig: Loaded) => (loadConfig.ok ? "" : loadConfig.error);
