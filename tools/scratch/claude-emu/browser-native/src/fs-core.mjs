// Shared memfs volume, seeded so onboarding is already complete.
import { Volume, createFsFromVolume } from "memfs";

export const vol = new Volume();
const fs = createFsFromVolume(vol);

const claudeJson = JSON.stringify({
  hasCompletedOnboarding: true,
  lastOnboardingVersion: { ISSUE: "2.1.112" },
  bypassPermissionsModeAccepted: true,
  numStartups: 5,
  installMethod: "browser-native",
  autoUpdates: false,
  theme: "dark",
  projects: {
    "/home/user/project": {
      allowedTools: [],
      hasTrustDialogAccepted: true,
      hasCompletedProjectOnboarding: true,
      hasClaudeMdExternalIncludesApproved: true,
      hasClaudeMdExternalIncludesWarningShown: true,
      history: [],
    },
  },
  oauthAccount: undefined,
  // Also declared here, not only on the command line: the channel warning list checks the
  // *configured* servers (settings scopes) and --mcp-config is not one of them, so a
  // command-line-only server draws "server:notebook · no MCP server configured with that name".
  ...(globalThis.__SEED_MCP_URL ? { mcpServers: { notebook: { type: "http", url: globalThis.__SEED_MCP_URL } } } : {}),
  // Gate 2 of the channels chain: mP6() = u8("tengu_harbor", false), and u8 falls back to
  // this map when the Statsig fetch (blocked here) never lands.
  cachedGrowthBookFeatures: { tengu_harbor: true },
  // cli.js normalises a key to its last-20-chars (VE(k)=k.slice(-20)) before the
  // approved-list check, so the stored form must be that suffix.
  customApiKeyResponses: {
    approved: [
      "sk-ant-browser-native", "sk-ant-browser-native".slice(-20),
      "sk-ant-mock-key-for-browser-native-poc", "sk-ant-mock-key-for-browser-native-poc".slice(-20),
      // A key the user pasted this session: pre-approved, or cli.js asks in the TUI
      // and answers Vw() with source "none" until it is answered.
      ...(globalThis.__SEED_API_KEY ? [String(globalThis.__SEED_API_KEY).slice(-20)] : []),
    ],
    rejected: [],
  },
});

vol.mkdirSync("/home/user", { recursive: true });
vol.mkdirSync("/home/user/.claude", { recursive: true });
vol.mkdirSync("/home/user/.config", { recursive: true });
vol.mkdirSync("/home/user/project", { recursive: true });
vol.mkdirSync("/tmp", { recursive: true });
vol.writeFileSync("/home/user/.claude.json", claudeJson);
vol.writeFileSync("/home/user/.claude/.config.json", claudeJson);
vol.writeFileSync("/home/user/.config/claude.json", claudeJson);
vol.mkdirSync("/home/user/.claude/statsig", { recursive: true });
vol.mkdirSync("/home/user/.claude/projects", { recursive: true });
vol.mkdirSync("/home/user/.claude/todos", { recursive: true });
// o7() reads claudeAiOauth from the plaintext store (platform is "linux", so no keychain).
// Two things read it, and they read different fields:
//   - the channels gate needs only accessToken to be non-null;
//   - i7()/xb() count the credential as a *login* only if scopes include "user:inference",
//     and a login alongside ANTHROPIC_API_KEY raises a permanent "Auth conflict" banner.
// So a session with a pasted API key seeds the marker with no inference scope: channels
// still pass, cli.js still authenticates with the key, and no banner appears.
// No refreshToken, so the refresh path returns early rather than calling a CORS-blocked endpoint.
const seededToken = globalThis.__SEED_CREDENTIAL || null;
vol.writeFileSync("/home/user/.claude/.credentials.json", JSON.stringify({
  claudeAiOauth: {
    accessToken: seededToken || "browser-native-local-channel",
    refreshToken: null,
    expiresAt: 4102444800000,
    // "user:profile" is deliberately absent: it makes AD() true, which sends this
    // credential to the profile/bootstrap endpoints, and the marker is not a real token.
    scopes: globalThis.__SEED_NO_LOGIN ? [] : ["user:inference"],
    subscriptionType: null,
    rateLimitTier: null,
  },
}));
vol.writeFileSync("/home/user/project/README.md", "# project\n\nA scratch project for the browser-native Claude Code session.\n");

// Files the host seeds before boot (project memory built from the notebook's own docs).
for (const [path, content] of Object.entries(globalThis.__SEED_FILES || {})) {
  try {
    const dir = path.slice(0, path.lastIndexOf("/"));
    if (dir) vol.mkdirSync(dir, { recursive: true });
    vol.writeFileSync(path, String(content));
  } catch {}
}

globalThis.__vol = vol;
export { fs };
