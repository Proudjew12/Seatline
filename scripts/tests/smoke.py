#!/usr/bin/env python3
"""Smoke-test coordinated development startup, HTTP behavior, and clean shutdown."""

from __future__ import annotations

import json
import os
import signal
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
HOST = "127.0.0.1"
STARTUP_TIMEOUT_SECONDS = 30.0
SHUTDOWN_TIMEOUT_SECONDS = 15.0


def port_is_open(port: int) -> bool:
    with socket.socket() as candidate:
        candidate.settimeout(0.2)
        return candidate.connect_ex((HOST, port)) == 0


def available_ports() -> tuple[int, int]:
    # Keep both bound during selection so the OS cannot return the same port twice.
    with socket.socket() as frontend, socket.socket() as backend:
        frontend.bind((HOST, 0))
        backend.bind((HOST, 0))
        return int(frontend.getsockname()[1]), int(backend.getsockname()[1])


def require_free_ports(frontend_port: int, backend_port: int) -> None:
    occupied = [port for port in (frontend_port, backend_port) if port_is_open(port)]
    if occupied:
        joined = ", ".join(str(port) for port in occupied)
        raise RuntimeError(f"Smoke-test port(s) already in use: {joined}")


def fetch(url: str, *, request_id: str | None = None) -> tuple[int, bytes, str | None]:
    headers = {"X-Request-ID": request_id} if request_id is not None else {}
    request = Request(url, headers=headers)
    with urlopen(request, timeout=1.5) as response:
        return response.status, response.read(), response.headers.get("X-Request-ID")


def wait_for_http(process: subprocess.Popen[str], url: str) -> tuple[int, bytes, str | None]:
    deadline = time.monotonic() + STARTUP_TIMEOUT_SECONDS
    last_error = "no response"
    while time.monotonic() < deadline:
        return_code = process.poll()
        if return_code is not None:
            raise RuntimeError(f"Development launcher exited early with status {return_code}")
        try:
            return fetch(url)
        except (OSError, TimeoutError, URLError) as error:
            last_error = str(error)
            time.sleep(0.2)
    raise RuntimeError(f"Timed out waiting for {url}: {last_error}")


def stop_launcher(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return

    process.send_signal(signal.SIGINT)
    time.sleep(0.05)
    if process.poll() is None:
        process.send_signal(signal.SIGINT)

    try:
        process.wait(timeout=SHUTDOWN_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def wait_for_closed_ports(frontend_port: int, backend_port: int) -> None:
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if not port_is_open(frontend_port) and not port_is_open(backend_port):
            return
        time.sleep(0.1)
    raise RuntimeError(
        f"Development processes did not release ports {frontend_port} and {backend_port}"
    )


def main() -> int:
    frontend_port, backend_port = available_ports()
    require_free_ports(frontend_port, backend_port)
    environment = os.environ.copy()
    environment.update(
        {
            "APP_ENV": "test",
            "APP_NAME": "Smoke Test API",
            "APP_VERSION": "test",
            "APP_HOST": HOST,
            "APP_PORT": str(backend_port),
            "APP_LOG_LEVEL": "WARNING",
            "APP_CORS_ORIGINS": f"http://{HOST}:{frontend_port}",
            "VITE_API_BASE_URL": "/api",
        }
    )
    with tempfile.TemporaryFile(mode="w+t", encoding="utf-8") as output_file:
        process = subprocess.Popen(
            [
                sys.executable,
                str(ROOT / "scripts" / "dev.py"),
                "--frontend-port",
                str(frontend_port),
            ],
            cwd=ROOT,
            env=environment,
            stdout=output_file,
            stderr=subprocess.STDOUT,
            text=True,
        )

        failure: Exception | None = None
        try:
            frontend_status, frontend_body, _ = wait_for_http(
                process, f"http://{HOST}:{frontend_port}/"
            )
            direct_backend_status, _, _ = wait_for_http(
                process, f"http://{HOST}:{backend_port}/api/health"
            )
            proxied_status, proxied_body, _ = wait_for_http(
                process, f"http://{HOST}:{frontend_port}/api/health"
            )
            _, _, request_id = fetch(
                f"http://{HOST}:{frontend_port}/api/health", request_id="smoke-request"
            )

            payload = json.loads(proxied_body)
            if frontend_status != 200 or b'id="root"' not in frontend_body:
                raise RuntimeError("Frontend did not return the expected application document")
            if (
                direct_backend_status != 200
                or proxied_status != 200
                or payload.get("status") != "ok"
            ):
                raise RuntimeError("Direct and frontend-proxied health checks must succeed")
            if request_id != "smoke-request":
                raise RuntimeError("Backend did not preserve a valid request ID")
        except Exception as error:
            failure = error
        finally:
            stop_launcher(process)

        output_file.seek(0)
        output = output_file.read()
    try:
        if process.returncode != 0:
            raise RuntimeError(
                f"Development launcher exited with status {process.returncode}\n{output}"
            )
        wait_for_closed_ports(frontend_port, backend_port)
        if failure is not None:
            raise failure
    except Exception as error:
        print(f"Smoke test failed: {error}", file=sys.stderr)
        return 1

    print("Smoke test passed: frontend/backend ready, proxy integration valid, shutdown clean.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
