"""Shared test fixtures for metadev tests.

Provides:
- MockAnthropicHandler: minimal mock of the Anthropic Messages streaming API
- mock_api: session-scoped fixture starting the mock server
- real_claude_env: per-test environment for running the real claude CLI
"""

import json
import os
import pathlib
import shutil
import threading
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
TEST_ROOT = REPO_ROOT / "tests" / "metadev" / ".testenv"


# ---------------------------------------------------------------------------
# Mock Anthropic API server
# ---------------------------------------------------------------------------


class MockAnthropicHandler(BaseHTTPRequestHandler):
    """Minimal mock of the Anthropic Messages streaming API.

    Captures request bodies in the class-level `requests` list so tests
    can inspect what claude sent.

    Supports a ``response_queue`` for scripted multi-turn interactions:
    push dicts with ``{"type": "tool_use", "name": "...", "input": {...}}``
    to make the mock return tool_use blocks instead of the default text.
    When the queue is empty the default "ok" text response is used.
    """

    requests: list[dict] = []
    response_queue: list[dict] = []

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        if "/messages" in self.path:
            try:
                parsed = json.loads(body)
                MockAnthropicHandler.requests.append(parsed)
            except json.JSONDecodeError:
                pass
            self._send_streaming_response()
        else:
            self.send_error(404)

    def _send_streaming_response(self):
        if MockAnthropicHandler.response_queue:
            config = MockAnthropicHandler.response_queue.pop(0)
            if config.get("type") == "tool_use":
                self._send_tool_use_streaming(config)
                return
        self._send_text_streaming()

    def _send_text_streaming(self):
        """Default response: a simple text block saying 'ok'."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()

        msg_id = f"msg_{uuid.uuid4().hex[:24]}"
        events = [
            {
                "type": "message_start",
                "message": {
                    "id": msg_id,
                    "type": "message",
                    "role": "assistant",
                    "content": [],
                    "model": "claude-sonnet-4-20250514",
                    "stop_reason": None,
                    "stop_sequence": None,
                    "usage": {"input_tokens": 10, "output_tokens": 0},
                },
            },
            {
                "type": "content_block_start",
                "index": 0,
                "content_block": {"type": "text", "text": ""},
            },
            {
                "type": "content_block_delta",
                "index": 0,
                "delta": {"type": "text_delta", "text": "ok"},
            },
            {"type": "content_block_stop", "index": 0},
            {
                "type": "message_delta",
                "delta": {"stop_reason": "end_turn", "stop_sequence": None},
                "usage": {"output_tokens": 1},
            },
            {"type": "message_stop"},
        ]

        for event in events:
            line = f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"
            self.wfile.write(line.encode())
            self.wfile.flush()

    def _send_tool_use_streaming(self, config: dict):
        """Return a tool_use content block so claude executes a tool."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()

        msg_id = f"msg_{uuid.uuid4().hex[:24]}"
        tool_id = f"toolu_{uuid.uuid4().hex[:24]}"
        input_json = json.dumps(config["input"])

        events = [
            {
                "type": "message_start",
                "message": {
                    "id": msg_id,
                    "type": "message",
                    "role": "assistant",
                    "content": [],
                    "model": "claude-sonnet-4-20250514",
                    "stop_reason": None,
                    "stop_sequence": None,
                    "usage": {"input_tokens": 10, "output_tokens": 0},
                },
            },
            {
                "type": "content_block_start",
                "index": 0,
                "content_block": {
                    "type": "tool_use",
                    "id": tool_id,
                    "name": config["name"],
                    "input": {},
                },
            },
            {
                "type": "content_block_delta",
                "index": 0,
                "delta": {"type": "input_json_delta", "partial_json": input_json},
            },
            {"type": "content_block_stop", "index": 0},
            {
                "type": "message_delta",
                "delta": {"stop_reason": "tool_use", "stop_sequence": None},
                "usage": {"output_tokens": 50},
            },
            {"type": "message_stop"},
        ]

        for event in events:
            line = f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"
            self.wfile.write(line.encode())
            self.wfile.flush()

    def log_message(self, format, *args):
        pass


@pytest.fixture(scope="session")
def mock_api():
    """Start mock Anthropic API server on a random port."""
    server = HTTPServer(("127.0.0.1", 0), MockAnthropicHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{port}/v1"
    server.shutdown()


# ---------------------------------------------------------------------------
# Real claude environment
# ---------------------------------------------------------------------------


def claude_available() -> bool:
    return shutil.which("claude") is not None


@pytest.fixture()
def real_claude_env(mock_api):
    """Environment for running the real claude CLI against the mock API."""
    workdir = TEST_ROOT / "real_claude"
    if workdir.exists():
        shutil.rmtree(workdir)
    workdir.mkdir(parents=True)

    env = os.environ.copy()
    env["ANTHROPIC_BASE_URL"] = mock_api
    env["ANTHROPIC_API_KEY"] = "sk-ant-test-fake-key"
    env["DISABLE_AUTOUPDATER"] = "1"
    env.pop("CLAUDECODE", None)

    yield env, workdir
    shutil.rmtree(workdir, ignore_errors=True)
