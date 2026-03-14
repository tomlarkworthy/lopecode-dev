# /// script
# requires-python = ">=3.10"
# dependencies = ["pytest"]
# ///
"""Tests for metadev hook behavior (SessionStart/UserPromptSubmit guards).

These tests use the real claude CLI against a mock API server to verify
that hooks in .claude/settings.json block unsandboxed sessions.

Run with:  uv run --with pytest pytest tests/test_metadev_hooks.py -v
"""

import os
import subprocess

import pytest

from conftest import REPO_ROOT, MockAnthropicHandler


class TestMetadevGuard:
    """Verify that the METADEV=1 guard hook blocks unsandboxed sessions."""

    def test_rejects_session_without_metadev(self, mock_api):
        """Without METADEV=1, hooks should block the prompt so no API call is made."""
        MockAnthropicHandler.requests.clear()

        env = os.environ.copy()
        env["ANTHROPIC_API_KEY"] = "sk-ant-test-fake-key"
        env["ANTHROPIC_BASE_URL"] = mock_api
        env["DISABLE_AUTOUPDATER"] = "1"
        env.pop("CLAUDECODE", None)
        env.pop("METADEV", None)

        try:
            subprocess.run(
                [
                    "claude", "-p", "hi",
                    "--dangerously-skip-permissions",
                    "--no-session-persistence",
                ],
                env=env,
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=5,
            )
        except subprocess.TimeoutExpired:
            pass

        assert len(MockAnthropicHandler.requests) == 0, (
            f"Hooks should have blocked the API call without METADEV=1, but "
            f"{len(MockAnthropicHandler.requests)} request(s) were made."
        )

    def test_allows_session_with_metadev(self, mock_api):
        """With METADEV=1, hooks should allow the API call through."""
        MockAnthropicHandler.requests.clear()

        env = os.environ.copy()
        env["ANTHROPIC_API_KEY"] = "sk-ant-test-fake-key"
        env["ANTHROPIC_BASE_URL"] = mock_api
        env["DISABLE_AUTOUPDATER"] = "1"
        env["METADEV"] = "1"
        env.pop("CLAUDECODE", None)

        result = subprocess.run(
            [
                "claude", "-p", "hi",
                "--dangerously-skip-permissions",
                "--no-session-persistence",
            ],
            env=env,
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert result.returncode == 0, f"Real claude failed: {result.stderr[:200]}"

        assert len(MockAnthropicHandler.requests) >= 1, (
            "Expected at least one API request with METADEV=1"
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
