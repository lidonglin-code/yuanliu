#!/usr/bin/env python3
"""Start the local workspace with detached, file-backed output."""
from pathlib import Path
import socket
import json
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
URL = 'http://127.0.0.1:4567/'


def healthy():
    try:
        with urllib.request.urlopen(URL + 'api/health', timeout=2) as response:
            return response.status == 200 and json.load(response).get('version') == 4
    except (OSError, UnicodeError, ValueError):
        return False


def main():
    if healthy():
        print('工作台已运行：' + URL)
        return 0
    try:
        with socket.socket() as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            probe.bind(('127.0.0.1', 4567))
    except OSError:
        print('4567 端口已被占用，可能仍在运行旧版服务。请先停止旧服务，再启动新版源流。', file=sys.stderr)
        return 1
    logs = ROOT / 'runtime'
    logs.mkdir(exist_ok=True)
    with (logs / 'server.log').open('ab', buffering=0) as output:
        process = subprocess.Popen(
            [sys.executable, '-u', str(ROOT / 'scripts' / 'serve-local.py')],
            stdin=subprocess.DEVNULL, stdout=output, stderr=subprocess.STDOUT,
            cwd=ROOT, start_new_session=True, close_fds=True,
        )
    for _ in range(20):
        if process.poll() is not None:
            break
        if healthy():
            print('工作台已启动：' + URL)
            return 0
        time.sleep(.15)
    print('启动未完成，请查看 runtime/server.log。', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
