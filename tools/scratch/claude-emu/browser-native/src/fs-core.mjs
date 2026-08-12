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
  // cli.js normalises a key to its last-20-chars (VE(k)=k.slice(-20)) before the
  // approved-list check, so the stored form must be that suffix.
  customApiKeyResponses: {
    approved: [
      "sk-ant-browser-native", "sk-ant-browser-native".slice(-20),
      "sk-ant-mock-key-for-browser-native-poc", "sk-ant-mock-key-for-browser-native-poc".slice(-20),
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
