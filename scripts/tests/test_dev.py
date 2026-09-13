"""Development launches honor selected ports without taking over existing servers."""

from __future__ import annotations

import contextlib
import io
import json
import os
import socket
import subprocess
import unittest
from unittest.mock import MagicMock, call, patch

from scripts import dev
from scripts.tests import smoke


class DevelopmentTests(unittest.TestCase):
    def test_frontend_port_defaults_and_valid_boundaries(self) -> None:
        self.assertEqual(dev.parse_args([]).frontend_port, 5173)
        for port in (1, 5174, 65_535):
            with self.subTest(port=port):
                self.assertEqual(dev.parse_args(["--frontend-port", str(port)]).frontend_port, port)

    def test_invalid_frontend_ports_fail_before_process_start(self) -> None:
        for value in ("0", "-1", "65536", "abc", "1.5", ""):
            with self.subTest(value=value):
                stderr = io.StringIO()
                with (
                    contextlib.redirect_stderr(stderr),
                    patch("scripts.dev.subprocess.Popen") as launch,
                    self.assertRaises(SystemExit) as raised,
                ):
                    dev.main(["--frontend-port", value])
                self.assertEqual(raised.exception.code, 2)
                self.assertIn("port must be an integer from 1 to 65535", stderr.getvalue())
                launch.assert_not_called()

    def test_selected_port_reaches_availability_check_launch_and_url(self) -> None:
        backend_response = subprocess.CompletedProcess(
            args=[], returncode=0, stdout=json.dumps({"host": "0.0.0.0", "port": 8123})
        )
        process = MagicMock()
        process.poll.return_value = 0
        stdout = io.StringIO()
        with (
            contextlib.redirect_stdout(stdout),
            patch("scripts.dev.Path.exists", return_value=True),
            patch("scripts.dev.subprocess.run", return_value=backend_response),
            patch("scripts.dev.subprocess.Popen", return_value=process) as launch,
            patch("scripts.dev.signal.signal"),
            patch.object(dev, "stop_process") as stop,
            patch(
                "scripts.dev.socket.create_connection", side_effect=ConnectionRefusedError
            ) as connect,
        ):
            self.assertEqual(dev.main(["--frontend-port", "5174"]), 0)

        self.assertEqual(
            connect.call_args_list,
            [call(("127.0.0.1", 8123), timeout=0.25), call(("127.0.0.1", 5174), timeout=0.25)],
        )
        npm = "npm.cmd" if os.name == "nt" else "npm"
        frontend_launch = launch.call_args_list[1]
        self.assertEqual(frontend_launch.args[0], [npm, "run", "dev", "--", "--port", "5174"])
        self.assertEqual(
            frontend_launch.kwargs["env"]["VITE_DEV_API_PROXY_TARGET"],
            "http://127.0.0.1:8123",
        )
        self.assertIn("Frontend: http://127.0.0.1:5174", stdout.getvalue())
        self.assertIn("Backend: http://127.0.0.1:8123", stdout.getvalue())
        self.assertEqual(stop.call_count, 2)

    def test_occupied_frontend_port_does_not_launch_or_stop_servers(self) -> None:
        backend_response = subprocess.CompletedProcess(
            args=[], returncode=0, stdout=json.dumps({"host": "127.0.0.1", "port": 8123})
        )
        stderr = io.StringIO()
        with (
            contextlib.redirect_stderr(stderr),
            patch("scripts.dev.Path.exists", return_value=True),
            patch("scripts.dev.subprocess.run", return_value=backend_response),
            patch("scripts.dev.subprocess.Popen") as launch,
            patch("scripts.dev.signal.signal"),
            patch.object(dev, "stop_process") as stop,
            patch(
                "scripts.dev.socket.create_connection",
                side_effect=[ConnectionRefusedError, MagicMock()],
            ),
        ):
            self.assertEqual(dev.main(["--frontend-port", "5174"]), 2)
        self.assertIn("Port 5174 is already in use", stderr.getvalue())
        launch.assert_not_called()
        stop.assert_not_called()

    def test_ipv6_backend_proxy_uses_loopback_and_brackets(self) -> None:
        self.assertEqual(dev.DevelopmentAddress("::", 8123).base_url, "http://[::1]:8123")

    def test_smoke_allocates_distinct_available_loopback_ports(self) -> None:
        frontend_port, backend_port = smoke.available_ports()
        self.assertNotEqual(frontend_port, backend_port)
        with socket.socket() as frontend, socket.socket() as backend:
            frontend.bind(("127.0.0.1", frontend_port))
            backend.bind(("127.0.0.1", backend_port))


if __name__ == "__main__":
    unittest.main()
