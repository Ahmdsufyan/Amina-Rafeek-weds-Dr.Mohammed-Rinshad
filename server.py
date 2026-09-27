"""Small same-origin web server and shared wedding guestbook; Python stdlib only."""

from __future__ import annotations

import json
import mimetypes
import os
import re
import threading
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
GREETINGS_FILE = DATA_DIR / "greetings.json"
PORT = int(os.environ.get("PORT", "4173"))
MAX_BODY_BYTES = 8 * 1024
MAX_GREETINGS = 300
RATE_WINDOW_SECONDS = 60
RATE_LIMIT_COUNT = 10
STORE_LOCK = threading.Lock()
RATE_LOCK = threading.Lock()
RECENT_POSTS: dict[str, list[float]] = {}
PUBLIC_TOP_LEVEL = {"assets", "css", "js"}

DATA_DIR.mkdir(parents=True, exist_ok=True)
if not GREETINGS_FILE.exists():
    GREETINGS_FILE.write_text("[]\n", encoding="utf-8")


def send_json(handler: BaseHTTPRequestHandler, status: int, value: object) -> None:
    payload = json.dumps(value, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(payload)))
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.end_headers()
    handler.wfile.write(payload)


def read_greetings() -> list[dict[str, str]]:
    try:
        content = json.loads(GREETINGS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        content = []
    return content if isinstance(content, list) else []


def clean_text(value: object, maximum: int) -> str:
    if not isinstance(value, str):
        return ""
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = "".join(char for char in value if char in "\n\t" or ord(char) >= 32 and ord(char) != 127)
    return value.strip()[:maximum]


def allowed_by_rate_limit(address: str) -> bool:
    now = time.monotonic()
    with RATE_LOCK:
        recent = [stamp for stamp in RECENT_POSTS.get(address, []) if now - stamp < RATE_WINDOW_SECONDS]
        if len(recent) >= RATE_LIMIT_COUNT:
            RECENT_POSTS[address] = recent
            return False
        recent.append(now)
        RECENT_POSTS[address] = recent
        return True


class WeddingHandler(BaseHTTPRequestHandler):
    server_version = "WeddingInvitation/1.0"

    def log_message(self, format_string: str, *args: object) -> None:
        # Avoid logging submitted greeting text or other request content.
        super().log_message(format_string, *args)

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == "/api/greetings":
            with STORE_LOCK:
                greetings = read_greetings()
            greetings.sort(key=lambda item: item.get("createdAt", ""), reverse=True)
            send_json(self, 200, {"greetings": greetings})
            return
        self.serve_static(path, head_only=False)

    def do_HEAD(self) -> None:
        self.serve_static(urlsplit(self.path).path, head_only=True)

    def do_POST(self) -> None:
        if urlsplit(self.path).path != "/api/greetings":
            send_json(self, 404, {"error": "Not found."})
            return

        origin = self.headers.get("Origin")
        host = self.headers.get("Host")
        if origin and host and urlsplit(origin).netloc != host:
            send_json(self, 403, {"error": "Please send your wish from the invitation page."})
            return

        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = MAX_BODY_BYTES + 1
        if size < 1 or size > MAX_BODY_BYTES:
            send_json(self, 413 if size > MAX_BODY_BYTES else 400, {"error": "Your message could not be read."})
            return
        try:
            body = json.loads(self.rfile.read(size).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            send_json(self, 400, {"error": "Please send a valid greeting."})
            return
        if not isinstance(body, dict):
            send_json(self, 400, {"error": "Please send a valid greeting."})
            return

        # Quietly accept, but do not publish, submissions that fill the hidden trap field.
        if isinstance(body.get("website"), str) and body["website"].strip():
            send_json(self, 201, {"greeting": None})
            return
        forwarded_ip = self.headers.get("X-Forwarded-For", "").split(",", 1)[0].strip()
        client_ip = self.headers.get("CF-Connecting-IP", "").strip() or forwarded_ip or self.client_address[0]
        if not allowed_by_rate_limit(client_ip):
            send_json(self, 429, {"error": "Please wait a little before sending another wish."})
            return

        name = clean_text(body.get("name"), 60)
        message = clean_text(body.get("message"), 500)
        if not name or not message:
            send_json(self, 400, {"error": "Please add your name and a short greeting."})
            return

        greeting = {
            "id": str(uuid.uuid4()),
            "name": name,
            "message": message,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        with STORE_LOCK:
            greetings = read_greetings()
            greetings.append(greeting)
            greetings = greetings[-MAX_GREETINGS:]
            temporary_file = DATA_DIR / ("greetings." + str(uuid.uuid4()) + ".tmp")
            temporary_file.write_text(json.dumps(greetings, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            temporary_file.replace(GREETINGS_FILE)
        send_json(self, 201, {"greeting": greeting})

    def serve_static(self, raw_path: str, *, head_only: bool) -> None:
        try:
            path = unquote(raw_path)
        except Exception:
            self.send_error(400)
            return
        relative = "index.html" if path == "/" else path.lstrip("/")
        candidate = (ROOT / relative).resolve()
        try:
            public_relative = candidate.relative_to(ROOT).as_posix()
        except ValueError:
            self.send_error(404)
            return
        if public_relative == "index.html":
            pass
        elif public_relative.split("/", 1)[0] not in PUBLIC_TOP_LEVEL:
            self.send_error(404)
            return
        if not candidate.is_file():
            self.send_error(404)
            return

        try:
            contents = candidate.read_bytes()
        except OSError:
            self.send_error(404)
            return
        mime_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        headers = {
            "Content-Type": mime_type + ("; charset=utf-8" if mime_type.startswith(("text/", "application/javascript")) else ""),
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Accept-Ranges": "bytes",
        }
        range_header = self.headers.get("Range", "")
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header)
        if match:
            if not match.group(1) and match.group(2):
                suffix_length = int(match.group(2))
                start = max(0, len(contents) - suffix_length)
                end = len(contents) - 1
            else:
                start = int(match.group(1) or 0)
                end = int(match.group(2) or max(0, len(contents) - 1))
            end = min(end, len(contents) - 1)
            if start > end or start >= len(contents):
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{len(contents)}")
                self.end_headers()
                return
            chunk = contents[start : end + 1]
            headers["Content-Range"] = f"bytes {start}-{end}/{len(contents)}"
            headers["Content-Length"] = str(len(chunk))
            self.send_response(206)
            for key, value in headers.items():
                self.send_header(key, value)
            self.end_headers()
            if not head_only:
                self.wfile.write(chunk)
            return

        headers["Content-Length"] = str(len(contents))
        self.send_response(200)
        for key, value in headers.items():
            self.send_header(key, value)
        self.end_headers()
        if not head_only:
            self.wfile.write(contents)


server = ThreadingHTTPServer(("0.0.0.0", PORT), WeddingHandler)
print(f"Wedding invitation listening on port {PORT}", flush=True)
server.serve_forever()
