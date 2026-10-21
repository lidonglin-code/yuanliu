#!/usr/bin/env python3
"""Serve the workspace, keeping the evolving introduction page fresh."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import json
from ai_gateway import Gateway, GatewayError


ROOT = Path(__file__).resolve().parent.parent
GATEWAY = Gateway()


class WorkspaceHandler(SimpleHTTPRequestHandler):
    def json_response(self, code, data):
        raw = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        try:
            self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def trusted(self):
        host = self.headers.get('Host', '')
        allowed = ('127.0.0.1:4567', 'localhost:4567')
        origin = self.headers.get('Origin')
        return host in allowed and (origin is None or origin == 'http://' + host) and self.headers.get('Sec-Fetch-Site') != 'cross-site'

    def do_GET(self):
        if urlsplit(self.path).path.startswith('/api/'):
            if not self.trusted():
                return self.json_response(403, {'error': '请求来源不受支持。'})
            if self.path == '/api/model/session':
                return self.json_response(200, GATEWAY.new_session())
            if self.path == '/api/health':
                return self.json_response(200, {'app':'yuanliu', 'version':3, 'modelConnector':'byok'})
            return self.json_response(404, {'error':'接口不存在。'})
        return super().do_GET()

    def do_POST(self):
        if not self.trusted() or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.json_response(403, {'error': '请求来源或格式不受支持。'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 300000:
                raise GatewayError('请求内容过大或为空。')
            self.connection.settimeout(15)
            data = json.loads(self.rfile.read(size))
            result = GATEWAY.call(self.headers.get('X-Yuanliu-Session', ''), urlsplit(self.path).path, data)
            self.json_response(200, result)
        except GatewayError as err:
            self.json_response(err.status, {'error': str(err)})
        except (ValueError, OSError):
            self.json_response(400, {'error':'请求无法读取，请重试。'})

    def is_introduction(self):
        path = urlsplit(self.path).path
        return path == '/introduce' or path.startswith('/introduce/')

    def send_head(self):
        if self.is_introduction():
            # A previously cached page must also receive the current content.
            for name in ('If-Modified-Since', 'If-None-Match'):
                if name in self.headers:
                    del self.headers[name]
        return super().send_head()

    def end_headers(self):
        if self.is_introduction():
            self.send_header('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    handler = partial(WorkspaceHandler, directory=str(ROOT / 'dist'))
    server = ThreadingHTTPServer(('127.0.0.1', 4567), handler)
    print('源流：http://127.0.0.1:4567/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
