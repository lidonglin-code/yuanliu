#!/usr/bin/env python3
"""Serve only the public workspace, restricted to trusted local requests."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
from ai_gateway import Gateway, GatewayError


ROOT = Path(__file__).resolve().parent.parent
GATEWAY = Gateway()

# Explicit publication boundary: ignored or newly added local files are never served.
PUBLIC_FILES = frozenset({
    'agent-model.js',
    'agents.js',
    'app.js',
    'assets/home-silk-v1.png',
    'assets/yuanliu-favicon.svg',
    'assets/yuanliu-lockup-dark.svg',
    'assets/yuanliu-lockup-light.svg',
    'assets/yuanliu-logo-dark.svg',
    'assets/yuanliu-logo-light.svg',
    'assets/yuanliu-mark-dark.svg',
    'assets/yuanliu-mark-light.svg',
    'assistant-model.js',
    'brand.css',
    'discovery-model.js',
    'discovery.css',
    'discovery.js',
    'document-model.js',
    'focus.css',
    'future.css',
    'home-gold.css',
    'home-refined.css',
    'home-scene.js',
    'home.css',
    'index.html',
    'intelligence-model.js',
    'intelligence.css',
    'intelligence.js',
    'memory-model.js',
    'memory.css',
    'memory.js',
    'model-connector.js',
    'model-registry.js',
    'navigation.js',
    'planning-refined.css',
    'project-model.js',
    'prompt-model.js',
    'skill-model.js',
    'skills.js',
    'style.css',
    'taxonomy-model.js',
    'taxonomy-ui.js',
    'theme.css',
    'theme.js',
    'topbar.css',
    'topbar.js',
    'training-model.js',
    'training.js',
    'ui-scale.css',
    'work-support-model.js',
    'work-support.css',
    'work-support.js',
    'workflow-model.js',
    'workspace-layout.css',
    'workspace.css',
})


class WorkspaceHandler(SimpleHTTPRequestHandler):
    server_version = "Yuanliu"
    sys_version = ""

    def json_response(self, code, data):
        raw = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        try:
            if self.command != 'HEAD':
                self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def trusted(self, allow_navigation=False):
        hosts = self.headers.get_all('Host', []) if hasattr(self.headers, 'get_all') else [self.headers.get('Host', '')]
        origins = self.headers.get_all('Origin', []) if hasattr(self.headers, 'get_all') else ([self.headers['Origin']] if 'Origin' in self.headers else [])
        if len(hosts) != 1 or hosts[0] not in ('127.0.0.1:4567', 'localhost:4567') or len(origins) > 1:
            return False
        if origins and origins[0] != 'http://' + hosts[0]:
            return False
        if self.headers.get('Sec-Fetch-Site') == 'cross-site':
            # Keep intentional clicks from README/chat usable; block cross-site fetches,
            # scripts, frames and images. API endpoints never allow this exception.
            return (allow_navigation and not origins and self.headers.get('Sec-Fetch-Mode') == 'navigate'
                    and self.headers.get('Sec-Fetch-Dest') == 'document'
                    and self.headers.get('Sec-Fetch-User') == '?1')
        return True

    def do_GET(self):
        path = urlsplit(self.path).path
        if not self.trusted(allow_navigation=not path.startswith('/api/')):
            return self.json_response(403, {'error': '请求来源不受支持。'})
        if path.startswith('/api/'):
            if path == '/api/model/session':
                return self.json_response(200, GATEWAY.new_session())
            if path == '/api/health':
                return self.json_response(200, {'app': 'yuanliu', 'version': 4, 'modelConnector': 'byok'})
            return self.json_response(404, {'error': '接口不存在。'})
        return super().do_GET()

    def do_HEAD(self):
        if not self.trusted(allow_navigation=True):
            return self.json_response(403, {'error': '请求来源不受支持。'})
        if urlsplit(self.path).path.startswith('/api/'):
            return self.json_response(405, {'error': '不支持此请求方式。'})
        return super().do_HEAD()

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

    def send_head(self):
        # HEAD and GET use one boundary. No listings, encoded traversal or symlinks.
        path = unquote(urlsplit(self.path).path, errors='replace')
        relative = 'index.html' if path == '/' else path.lstrip('/')
        if relative not in PUBLIC_FILES or any(part in ('.', '..') for part in path.split('/')):
            self.send_error(404, 'Not found')
            return None
        root = Path(self.directory).resolve()
        target = root.joinpath(*relative.split('/'))
        try:
            if any(root.joinpath(*relative.split('/')[:i]).is_symlink() for i in range(1, len(relative.split('/')) + 1)):
                raise ValueError('symlink')
            target.resolve().relative_to(root)
        except (ValueError, OSError, RuntimeError):
            self.send_error(404, 'Not found')
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404, 'Not found')
        return None

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('X-Frame-Options', 'DENY')
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
