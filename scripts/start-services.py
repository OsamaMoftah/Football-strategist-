"""Run the web app and loopback CV worker together; fail closed if either exits."""

import os
from pathlib import Path
import signal
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[1]
os.chdir(root)
children = []
stopping = False


def stop(*_):
    global stopping
    if stopping:
        return
    stopping = True
    for child in children:
        if child.poll() is None:
            child.terminate()


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    children.append(
        subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "pipeline.service.app:create_app",
                "--factory",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
                "--no-access-log",
            ]
        )
    )
    children.append(subprocess.Popen(["node", "server.js"]))
    while not stopping and all(child.poll() is None for child in children):
        time.sleep(0.25)
finally:
    failed = any(child.poll() not in (None, 0) for child in children)
    stop()
    for child in children:
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()
    sys.exit(1 if failed else 0)
