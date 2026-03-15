# /// script
# requires-python = ">=3.10"
# dependencies = ["pytest"]
# ///
"""Tests for metadev session restart/resume logic using real claude CLI.

Uses a mock Anthropic API server so real claude runs but no tokens are consumed.

Run with:  uv run --with pytest pytest tests/metadev/test_metadev_restart.py -v
"""

import json
import os
import re
import shutil
import subprocess
import time
import uuid

import pytest

from conftest import REPO_ROOT, MockAnthropicHandler

# UUID pattern for session IDs
_UUID = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

# Session directory for this repo (used by claude and SessionEnd hook)
_SESSION_DIR = os.path.expanduser(
    "~/.claude/projects/" + str(REPO_ROOT).replace("/", "-").replace(".", "-")
)


def parse_metadev_output(output: str) -> dict:
    """Extract session IDs and events from metadev stdout.

    Returns a dict with keys (all optional):
      resumed_sid:  SESSION_ID from "resuming session" line
      events:       list of event strings found
    """
    result: dict = {"events": []}

    m = re.search(rf'resuming session ({_UUID})', output)
    if m:
        result["resumed_sid"] = m.group(1)

    for marker in [
        "restart requested",
        "starting fresh session",
        "resuming session",
        "re-exec with updated config",
    ]:
        if marker in output:
            result["events"].append(marker)

    return result


def _run_metadev_restart(
    mock_api: str,
    cid: str,
    bash_command: str,
    *,
    wait_for: str,
    timeout: float = 90,
) -> tuple[str, dict]:
    """Run metadev, have the mock execute a Bash command, wait for a marker.

    Returns (raw_output, parsed_output).
    """
    MockAnthropicHandler.requests.clear()
    MockAnthropicHandler.response_queue.clear()
    MockAnthropicHandler.response_queue.extend([
        {"type": "tool_use", "name": "Skill", "input": {"skill": "restart"}},
        {
            "type": "tool_use",
            "name": "Bash",
            "input": {"command": bash_command, "description": "restart"},
        },
    ])

    env = os.environ.copy()
    env["ANTHROPIC_API_KEY"] = "sk-ant-test-fake-key"
    env["ANTHROPIC_BASE_URL"] = mock_api
    env["DISABLE_AUTOUPDATER"] = "1"
    env["METADEV_CORRELATION_ID"] = cid
    env.pop("CLAUDECODE", None)

    proc = subprocess.Popen(
        [str(REPO_ROOT / "metadev"), "-p", "/restart"],
        env=env,
        cwd=str(REPO_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    output = ""
    deadline = time.time() + timeout
    found = False
    try:
        while time.time() < deadline:
            line = proc.stdout.readline()
            if not line:
                break
            output += line
            if wait_for in line:
                found = True
                break
    finally:
        proc.kill()
        proc.wait()

    if not found:
        raise AssertionError(
            f"Timed out waiting for '{wait_for}' in metadev output.\n"
            f"Output so far:\n{output}"
        )
    return output, parse_metadev_output(output)


class TestRealClaudeSession:
    """Integration tests using real claude CLI with mock API server."""

    def test_session_creates_jsonl(self, real_claude_env):
        """claude -p with --session-id should succeed against the mock API."""
        env, workdir = real_claude_env
        sid = str(uuid.uuid4())

        result = subprocess.run(
            [
                "claude", "-p", "hi",
                "--session-id", sid,
                "--dangerously-skip-permissions",
                "--no-session-persistence",
            ],
            env=env, cwd=str(workdir),
            capture_output=True, text=True, timeout=30,
        )
        assert result.returncode == 0, (
            f"Real claude failed: {result.stderr[:200]}"
        )

    def test_resume_after_create(self, real_claude_env):
        """claude --resume should succeed after creating a session."""
        env, workdir = real_claude_env
        sid = str(uuid.uuid4())

        r1 = subprocess.run(
            [
                "claude", "-p", "hi",
                "--session-id", sid,
                "--dangerously-skip-permissions",
            ],
            env=env, cwd=str(workdir),
            capture_output=True, text=True, timeout=30,
        )
        assert r1.returncode == 0, f"Create failed: {r1.stderr[:200]}"

        r2 = subprocess.run(
            [
                "claude", "-p", "hi",
                "--resume", sid,
                "--dangerously-skip-permissions",
            ],
            env=env, cwd=str(workdir),
            capture_output=True, text=True, timeout=30,
        )
        assert r2.returncode == 0, f"Resume failed: {r2.stderr[:200]}"

    def test_restart_skill_in_request(self, mock_api):
        """Running claude from the repo root should include the restart skill.

        The /restart skill is defined in .claude/commands/restart.md.  Claude Code
        sends available skills to the API as a system-reminder inside the first
        user message.
        """
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

        assert len(MockAnthropicHandler.requests) >= 1, "No API requests captured"
        req = MockAnthropicHandler.requests[0]

        tool_names = [t["name"] for t in req.get("tools", [])]
        assert "Skill" in tool_names, f"Skill tool missing. Tools: {tool_names}"

        user_msg = req["messages"][0]
        all_text = " ".join(
            block.get("text", "")
            for block in user_msg["content"]
            if block.get("type") == "text"
        )
        assert "restart" in all_text.lower(), (
            "restart skill not found in user message system-reminders. "
            f"Content preview: {all_text[:500]}"
        )

    def test_restart_skill_writes_descriptor(self, mock_api):
        """The /restart skill should write a restart descriptor file.

        Uses the mock API's response queue to script a multi-turn conversation:
        1. Mock returns Skill tool_use -> claude expands restart.md
        2. Mock returns Bash tool_use -> claude writes the restart descriptor
        3. Mock returns default text -> claude exits
        """
        MockAnthropicHandler.requests.clear()
        MockAnthropicHandler.response_queue.clear()

        cid = str(uuid.uuid4())
        restart_file = f"/tmp/metadev-restart-{cid}.json"
        descriptor = '{"resume": true, "reason": "test restart"}'

        # Queue scripted responses
        MockAnthropicHandler.response_queue.extend([
            # Turn 1: invoke the Skill tool to expand restart.md
            {
                "type": "tool_use",
                "name": "Skill",
                "input": {"skill": "restart"},
            },
            # Turn 2: write the restart descriptor via Bash
            {
                "type": "tool_use",
                "name": "Bash",
                "input": {
                    "command": f"echo '{descriptor}' > {restart_file}",
                    "description": "Write restart descriptor",
                },
            },
            # Turn 3: default text response (queue empty -> "ok")
        ])

        env = os.environ.copy()
        env["ANTHROPIC_API_KEY"] = "sk-ant-test-fake-key"
        env["ANTHROPIC_BASE_URL"] = mock_api
        env["DISABLE_AUTOUPDATER"] = "1"
        env["METADEV"] = "1"
        env["METADEV_CORRELATION_ID"] = cid
        env.pop("CLAUDECODE", None)

        try:
            result = subprocess.run(
                [
                    "claude", "-p", "/restart",
                    "--dangerously-skip-permissions",
                    "--no-session-persistence",
                ],
                env=env,
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=60,
            )

            assert os.path.exists(restart_file), (
                f"Restart descriptor not written at {restart_file}. "
                f"rc={result.returncode} "
                f"stdout={result.stdout[:300]} "
                f"stderr={result.stderr[:300]}"
            )

            with open(restart_file) as f:
                desc = json.load(f)
            assert desc["resume"] is True
            assert desc["reason"] == "test restart"
        finally:
            # Clean up the descriptor file
            if os.path.exists(restart_file):
                os.unlink(restart_file)


class TestMetadevRestartLoop:
    """Integration tests that exercise the full metadev wrapper.

    These require ``safehouse`` to be installed (skipped otherwise).
    The metadev restart loop is tested end-to-end: metadev launches claude,
    claude writes a restart descriptor, metadev detects it and re-launches.

    Key invariants tested:
    - resume=true  -> metadev resumes a real session via --resume (marker file)
    - resume=false -> metadev starts fresh (no --resume)
    """

    @pytest.fixture(autouse=True)
    def _check_safehouse(self):
        if not shutil.which("safehouse"):
            pytest.skip("safehouse not installed")
        if os.environ.get("METADEV") == "1":
            pytest.skip("cannot nest safehouse inside an existing sandbox")

    def test_resume_uses_marker_session(self, mock_api):
        """resume=true: metadev reads marker file and resumes that session.

        Verifies that the resumed session ID corresponds to a real .jsonl
        file on disk (created by the first claude run).
        """
        cid = str(uuid.uuid4())
        restart_file = f"/tmp/metadev-restart-{cid}.json"
        descriptor = '{"resume": true, "reason": "test resume"}'

        try:
            output, parsed = _run_metadev_restart(
                mock_api,
                cid,
                bash_command=f"echo '{descriptor}' > {restart_file}",
                wait_for="resuming session",
            )
        finally:
            for f in [restart_file, f"/tmp/metadev-session-{cid}"]:
                if os.path.exists(f):
                    os.unlink(f)

        assert "restart requested" in parsed["events"]
        assert "resuming session" in parsed["events"]
        assert "resumed_sid" in parsed, f"No resumed SID found.\n{output}"

        # The resumed session must correspond to a real session file
        resumed_jsonl = os.path.join(_SESSION_DIR, f"{parsed['resumed_sid']}.jsonl")
        assert os.path.exists(resumed_jsonl), (
            f"Resumed session {parsed['resumed_sid']} has no .jsonl file at "
            f"{resumed_jsonl}.\n{output}"
        )

    def test_resume_auto_continues(self, mock_api):
        """resume=true: resumed session auto-sends a continue prompt.

        After restart with resume=true, metadev should pass an auto-continue
        prompt so the user doesn't have to manually type "continue".
        Verifies the mock API receives a message containing the prompt.
        """
        cid = str(uuid.uuid4())
        restart_file = f"/tmp/metadev-restart-{cid}.json"
        descriptor = '{"resume": true, "reason": "test auto-continue"}'

        MockAnthropicHandler.requests.clear()
        MockAnthropicHandler.response_queue.clear()
        MockAnthropicHandler.response_queue.extend([
            {"type": "tool_use", "name": "Skill", "input": {"skill": "restart"}},
            {
                "type": "tool_use",
                "name": "Bash",
                "input": {
                    "command": f"echo '{descriptor}' > {restart_file}",
                    "description": "restart",
                },
            },
            # Queue empty after this -> resumed session gets default "ok"
        ])

        env = os.environ.copy()
        env["ANTHROPIC_API_KEY"] = "sk-ant-test-fake-key"
        env["ANTHROPIC_BASE_URL"] = mock_api
        env["DISABLE_AUTOUPDATER"] = "1"
        env["METADEV_CORRELATION_ID"] = cid
        env.pop("CLAUDECODE", None)

        proc = subprocess.Popen(
            [str(REPO_ROOT / "metadev"), "-p", "/restart"],
            env=env,
            cwd=str(REPO_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        output = ""
        deadline = time.time() + 90
        found_resume = False
        found_continue = False
        try:
            while time.time() < deadline:
                line = proc.stdout.readline()
                if not line:
                    break
                output += line
                if "resuming session" in line:
                    found_resume = True
                # After resume marker, poll API for auto-continue message
                if found_resume:
                    for req in MockAnthropicHandler.requests:
                        for msg in req.get("messages", []):
                            content = msg.get("content", [])
                            if isinstance(content, str):
                                if "Continue where you left off" in content:
                                    found_continue = True
                            elif isinstance(content, list):
                                for block in content:
                                    if isinstance(block, dict):
                                        text = block.get("text", "")
                                        if "Continue where you left off" in text:
                                            found_continue = True
                    if found_continue:
                        break
        finally:
            proc.kill()
            proc.wait()
            for f in [restart_file, f"/tmp/metadev-session-{cid}"]:
                if os.path.exists(f):
                    os.unlink(f)

        assert found_resume, (
            f"Never saw 'resuming session' in metadev output.\n{output}"
        )
        assert found_continue, (
            f"Auto-continue prompt not sent to API after resume.\n"
            f"API requests: {len(MockAnthropicHandler.requests)}\n{output}"
        )

    def test_resume_includes_command_output(self, mock_api):
        """resume=true with commands: auto-continue prompt includes command output.

        When the restart descriptor has commands, the output of those commands
        should be captured and included in the auto-continue prompt sent to
        the resumed session.
        """
        cid = str(uuid.uuid4())
        restart_file = f"/tmp/metadev-restart-{cid}.json"
        # Descriptor with a command that produces distinctive output
        descriptor = json.dumps({
            "resume": True,
            "reason": "test cmd output",
            "commands": ["echo SENTINEL_CMD_OUTPUT_12345"],
        })

        MockAnthropicHandler.requests.clear()
        MockAnthropicHandler.response_queue.clear()
        MockAnthropicHandler.response_queue.extend([
            {"type": "tool_use", "name": "Skill", "input": {"skill": "restart"}},
            {
                "type": "tool_use",
                "name": "Bash",
                "input": {
                    "command": (
                        f"cat > {restart_file} << 'RESTART'\n"
                        f"{descriptor}\n"
                        f"RESTART"
                    ),
                    "description": "restart",
                },
            },
        ])

        env = os.environ.copy()
        env["ANTHROPIC_API_KEY"] = "sk-ant-test-fake-key"
        env["ANTHROPIC_BASE_URL"] = mock_api
        env["DISABLE_AUTOUPDATER"] = "1"
        env["METADEV_CORRELATION_ID"] = cid
        env.pop("CLAUDECODE", None)

        env["METADEV_NOCONFIRM"] = "1"

        proc = subprocess.Popen(
            [str(REPO_ROOT / "metadev"), "-p", "/restart"],
            env=env,
            cwd=str(REPO_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        output = ""
        deadline = time.time() + 90
        found_resume = False
        found_sentinel = False
        try:
            while time.time() < deadline:
                line = proc.stdout.readline()
                if not line:
                    break
                output += line
                if "resuming session" in line:
                    found_resume = True
                if found_resume:
                    for req in MockAnthropicHandler.requests:
                        for msg in req.get("messages", []):
                            content = msg.get("content", [])
                            if isinstance(content, str):
                                if "SENTINEL_CMD_OUTPUT_12345" in content:
                                    found_sentinel = True
                            elif isinstance(content, list):
                                for block in content:
                                    if isinstance(block, dict):
                                        text = block.get("text", "")
                                        if "SENTINEL_CMD_OUTPUT_12345" in text:
                                            found_sentinel = True
                    if found_sentinel:
                        break
        finally:
            proc.kill()
            proc.wait()
            for f in [restart_file, f"/tmp/metadev-session-{cid}"]:
                if os.path.exists(f):
                    os.unlink(f)

        assert found_resume, (
            f"Never saw 'resuming session' in metadev output.\n{output}"
        )
        assert found_sentinel, (
            f"Command output not found in auto-continue prompt.\n"
            f"API requests: {len(MockAnthropicHandler.requests)}\n{output}"
        )

    def test_command_env_vars_propagate(self, mock_api):
        """Pre-restart commands that export env vars should propagate through exec.

        This is a regression test for the eval-in-subshell bug: previously,
        `out=$(eval "$cmd" ...)` ran eval in a command substitution, so any
        `export` calls (like `assume` setting AWS creds) were lost.

        Strategy: the pre-restart command exports AWS_VAULT (which is in
        metadev's ENV_PASS list, so safehouse passes it to claude). After
        re-exec, the resumed claude session runs `printenv AWS_VAULT` via
        Bash tool_use, and we verify the value appears in the API request.
        """
        cid = str(uuid.uuid4())
        restart_file = f"/tmp/metadev-restart-{cid}.json"
        sentinel_val = f"test-role-{uuid.uuid4().hex[:8]}"
        descriptor = json.dumps({
            "resume": True,
            "reason": "test env propagation",
            "commands": [f"export AWS_VAULT={sentinel_val}"],
        })

        MockAnthropicHandler.requests.clear()
        MockAnthropicHandler.response_queue.clear()
        MockAnthropicHandler.response_queue.extend([
            {"type": "tool_use", "name": "Skill", "input": {"skill": "restart"}},
            {
                "type": "tool_use",
                "name": "Bash",
                "input": {
                    "command": (
                        f"cat > {restart_file} << 'RESTART'\n"
                        f"{descriptor}\n"
                        f"RESTART"
                    ),
                    "description": "restart",
                },
            },
            # After resume, the mock returns a Bash command to check env
            {
                "type": "tool_use",
                "name": "Bash",
                "input": {
                    "command": "printenv AWS_VAULT",
                    "description": "check env",
                },
            },
        ])

        env = os.environ.copy()
        env["ANTHROPIC_API_KEY"] = "sk-ant-test-fake-key"
        env["ANTHROPIC_BASE_URL"] = mock_api
        env["DISABLE_AUTOUPDATER"] = "1"
        env["METADEV_CORRELATION_ID"] = cid
        env["METADEV_NOCONFIRM"] = "1"
        env.pop("CLAUDECODE", None)
        # Ensure AWS_VAULT is NOT set initially
        env.pop("AWS_VAULT", None)

        proc = subprocess.Popen(
            [str(REPO_ROOT / "metadev"), "-p", "/restart"],
            env=env,
            cwd=str(REPO_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        output = ""
        deadline = time.time() + 90
        found_resume = False
        found_sentinel_in_env = False
        try:
            while time.time() < deadline:
                line = proc.stdout.readline()
                if not line:
                    break
                output += line
                if "resuming session" in line:
                    found_resume = True
                # After resume, check API requests for the Bash tool result
                # containing the sentinel value (printenv output)
                if found_resume:
                    for req in MockAnthropicHandler.requests:
                        for msg in req.get("messages", []):
                            content = msg.get("content", [])
                            if isinstance(content, list):
                                for block in content:
                                    if isinstance(block, dict):
                                        text = block.get("text", "") + block.get("content", "")
                                        if sentinel_val in text:
                                            found_sentinel_in_env = True
                    if found_sentinel_in_env:
                        break
        finally:
            proc.kill()
            proc.wait()
            for f in [restart_file, f"/tmp/metadev-session-{cid}"]:
                if os.path.exists(f):
                    os.unlink(f)

        assert found_resume, (
            f"Never saw 'resuming session' in metadev output.\n{output}"
        )
        assert found_sentinel_in_env, (
            f"AWS_VAULT={sentinel_val} did not propagate through restart. "
            f"This indicates eval is still running in a subshell.\n"
            f"API requests: {len(MockAnthropicHandler.requests)}\n{output}"
        )

    def test_fresh_start(self, mock_api):
        """resume=false: metadev starts a fresh session (no --resume)."""
        cid = str(uuid.uuid4())
        restart_file = f"/tmp/metadev-restart-{cid}.json"
        descriptor = '{"resume": false, "reason": "test fresh start"}'

        try:
            output, parsed = _run_metadev_restart(
                mock_api,
                cid,
                bash_command=f"echo '{descriptor}' > {restart_file}",
                wait_for="starting fresh session",
            )
        finally:
            for f in [restart_file, f"/tmp/metadev-session-{cid}"]:
                if os.path.exists(f):
                    os.unlink(f)

        assert "restart requested" in parsed["events"]
        assert "starting fresh session" in parsed["events"]
        assert "resuming session" not in parsed["events"], (
            f"Fresh start should not resume a session.\n{output}"
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
