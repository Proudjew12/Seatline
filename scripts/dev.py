#!/usr/bin/env python3
"""Run frontend and backend together and stop both on launcher exit."""

from __future__ import annotations

import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import time
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
WINDOWS_NEW_PROCESS_GROUP = int(subprocess.__dict__.get("CREATE_NEW_PROCESS_GROUP", 0))
WINDOWS_CTRL_BREAK_EVENT: Any = signal.__dict__.get("CTRL_BREAK_EVENT", signal.SIGTERM)


@dataclass(slots=True)
class ShutdownState:
    requested: bool = False


@dataclass(frozen=True, slots=True)
class DevelopmentAddress:
    host: str
    port: int

    @property
    def client_host(self) -> str:
        if self.host in {"0.0.0.0", "::", "[::]"}:
            return "127.0.0.1" if self.host == "0.0.0.0" else "::1"
        return self.host

    @property
    def base_url(self) -> str:
        host = f"[{self.client_host}]" if ":" in self.client_host else self.client_host
        return f"http://{host}:{self.port}"


def backend_python() -> Path:
    scripts_dir = "Scripts" if os.name == "nt" else "bin"
    executable = "python.exe" if os.name == "nt" else "python"
    return BACKEND_DIR / ".venv" / scripts_dir / executable


def process_options() -> dict[str, Any]:
    if os.name == "nt":
        return {"creationflags": WINDOWS_NEW_PROCESS_GROUP}
    return {"start_new_session": True}


def stop_process(process: subprocess.Popen[bytes]) -> None:
    try:
        if os.name == "nt":
            if process.poll() is not None:
                return
            process.send_signal(WINDOWS_CTRL_BREAK_EVENT)
        else:
            os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        return

    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            if os.name == "nt":
                process.kill()
            else:
                os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)


def shutdown_signals() -> tuple[signal.Signals, ...]:
    values = [signal.SIGINT, signal.SIGTERM]
    if hasattr(signal, "SIGHUP"):
        values.append(signal.SIGHUP)
    return tuple(values)


def install_shutdown_handlers(state: ShutdownState) -> None:
    def request_shutdown(_signum: int, _frame: object) -> None:
        state.requested = True

    for shutdown_signal in shutdown_signals():
        signal.signal(shutdown_signal, request_shutdown)


def shield_cleanup_from_repeated_interrupts() -> None:
    for shutdown_signal in shutdown_signals():
        signal.signal(shutdown_signal, signal.SIG_IGN)


def ensure_port_available(host: str, port: int) -> None:
    try:
        with socket.create_connection((host, port), timeout=0.25):
            pass
    except OSError:
        return
    raise OSError(f"Port {port} is already in use on {host}")


def backend_address() -> DevelopmentAddress:
    result = subprocess.run(
        [sys.executable, "manage.py", "address"],
        cwd=BACKEND_DIR,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        message = result.stderr.strip() or "backend address validation failed"
        raise OSError(message)
    try:
        payload = json.loads(result.stdout)
        host = payload["host"]
        port = payload["port"]
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise OSError("Backend returned an invalid development address") from error
    if not isinstance(host, str) or not host or isinstance(port, bool) or not isinstance(port, int):
        raise OSError("Backend returned an invalid development address")
    return DevelopmentAddress(host=host, port=port)


def start_processes(
    address: DevelopmentAddress, *, frontend_port: int = 5173
) -> list[subprocess.Popen[bytes]]:
    npm = "npm.cmd" if os.name == "nt" else "npm"
    options = process_options()
    processes: list[subprocess.Popen[bytes]] = []
    frontend_environment = os.environ.copy()
    frontend_environment["VITE_DEV_API_PROXY_TARGET"] = address.base_url

    try:
        processes.append(
            subprocess.Popen(
                [sys.executable, "manage.py", "dev"],
                cwd=BACKEND_DIR,
                **options,
            )
        )
        processes.append(
            subprocess.Popen(
                [npm, "run", "dev", "--", "--port", str(frontend_port)],
                cwd=FRONTEND_DIR,
                env=frontend_environment,
                **options,
            )
        )
    except OSError:
        for process in reversed(processes):
            stop_process(process)
        raise

    return processes


def valid_port(value: str) -> int:
    try:
        port = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("port must be an integer from 1 to 65535") from error
    if not 1 <= port <= 65_535:
        raise argparse.ArgumentTypeError("port must be an integer from 1 to 65535")
    return port


def parse_args(arguments: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--frontend-port",
        type=valid_port,
        default=5173,
        help="Frontend development port (default: 5173).",
    )
    return parser.parse_args(arguments)


def main(arguments: Sequence[str] | None = None) -> int:
    args = parse_args(arguments)
    python = backend_python()
    if not python.exists():
        print(
            "Backend virtual environment is missing. Run `npm run setup` first.",
            file=sys.stderr,
        )
        return 2
    if not (FRONTEND_DIR / "node_modules").exists():
        print(
            "Frontend dependencies are missing. Run `npm run setup` first.",
            file=sys.stderr,
        )
        return 2

    shutdown = ShutdownState()
    install_shutdown_handlers(shutdown)
    processes: list[subprocess.Popen[bytes]] = []
    try:
        address = backend_address()
        ensure_port_available(address.client_host, address.port)
        ensure_port_available("127.0.0.1", args.frontend_port)
        processes = start_processes(address, frontend_port=args.frontend_port)
        print(f"Frontend: http://127.0.0.1:{args.frontend_port}", flush=True)
        print(f"Backend: {address.base_url}", flush=True)

        while not shutdown.requested:
            for process in processes:
                return_code = process.poll()
                if return_code is not None:
                    return return_code
            time.sleep(0.2)
        return 0
    except KeyboardInterrupt:
        # Defensive fallback for platforms that deliver console interrupts outside
        # the handlers above. Cleanup below is protected from repeated interrupts.
        return 0
    except OSError as error:
        print(f"Could not start the development processes: {error}", file=sys.stderr)
        return 2
    finally:
        shield_cleanup_from_repeated_interrupts()
        for process in reversed(processes):
            stop_process(process)


if __name__ == "__main__":
    raise SystemExit(main())
