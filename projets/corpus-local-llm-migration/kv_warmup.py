"""Optional bounded KV-cache warm-up for the local Corpus model."""
import http.client
import json
import threading
import time


class KvWarmup:
    def __init__(
        self,
        port,
        directory,
        *,
        timeout=10,
        poll_delay=.25,
        deadline=180,
    ):
        self.port = port
        self.directory = str(directory)
        self.timeout = timeout
        self.poll_delay = poll_delay
        self.deadline = deadline

        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._started = False
        self._thread = None

    def _request(self, method, path, payload=None):
        connection = http.client.HTTPConnection(
            "127.0.0.1",
            self.port,
            timeout=self.timeout,
        )

        try:
            headers = {
                "x-opencode-directory": self.directory,
                "Accept": "application/json",
            }

            body = None

            if payload is not None:
                body = json.dumps(payload).encode()
                headers["Content-Type"] = "application/json"

            connection.request(
                method,
                path,
                body=body,
                headers=headers,
            )

            response = connection.getresponse()

            if response.status < 200 or response.status >= 300:
                raise ValueError(
                    f"KV warm-up HTTP {response.status}"
                )

            data = response.read(2_000_001)

            if len(data) > 2_000_000:
                raise ValueError(
                    "KV warm-up response too large"
                )

            if not data:
                return None

            return json.loads(data)

        finally:
            connection.close()

    def _payload(self):
        return {
            "agent": "corpus",
            "model": {
                "providerID": "corpus-local",
                "modelID": "qwen3.6-35b-a3b-ud-q4-k-m",
            },
            "variant": "direct",
            "parts": [
                {
                    "type": "text",
                    "text": "TEST SILENCIEUX",
                },
            ],
        }

    def _run(self):
        session_id = None

        try:
            created = self._request("POST", "/session", {})

            if not isinstance(created, dict):
                return False

            session_id = created.get("id")

            if not isinstance(session_id, str) or not session_id:
                return False

            self._request(
                "POST",
                f"/session/{session_id}/prompt_async",
                self._payload(),
            )

            end = time.monotonic() + self.deadline
            saw_busy = False

            while (
                not self._stop.is_set()
                and time.monotonic() < end
            ):
                statuses = self._request(
                    "GET",
                    "/session/status",
                )

                if not isinstance(statuses, dict):
                    raise ValueError(
                        "Invalid session status"
                    )

                status = statuses.get(session_id)

                if isinstance(status, dict):
                    kind = status.get("type")

                    if kind == "busy":
                        saw_busy = True

                    elif kind == "idle" and saw_busy:
                        return True

                elif status is None and saw_busy:
                    return True

                if self._stop.wait(self.poll_delay):
                    break

            return False

        except (
            OSError,
            ValueError,
            json.JSONDecodeError,
            http.client.HTTPException,
        ):
            return False

        finally:
            if session_id:
                try:
                    self._request(
                        "DELETE",
                        f"/session/{session_id}",
                    )
                except (
                    OSError,
                    ValueError,
                    json.JSONDecodeError,
                    http.client.HTTPException,
                ):
                    pass

    def start(self):
        with self._lock:
            if self._started or self._stop.is_set():
                return

            self._started = True
            self._thread = threading.Thread(
                target=self._run,
                name="corpus-kv-warmup",
                daemon=True,
            )
            self._thread.start()

    def join(self, timeout=None):
        thread = self._thread

        if thread is not None:
            thread.join(timeout)

    def close(self):
        self._stop.set()
