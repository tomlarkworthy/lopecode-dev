// A preload for `bun test`: a test that calls fetch fails, and says what it asked for.
globalThis.fetch = ((input: unknown) => {
  throw new Error(`fetch was called: ${String((input as { url?: string })?.url ?? input)}`);
}) as typeof fetch;
