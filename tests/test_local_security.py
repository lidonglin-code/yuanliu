"""HTTP boundary regressions; use disposable fixtures, never browser work data."""
import http.client
import importlib.util
import json
import re
import sys
import tempfile
import threading
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('secured_local_server', ROOT / 'scripts/serve-local.py')
server_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server_module)


class QuietHandler(server_module.WorkspaceHandler):
    def log_message(self, *args):
        pass


class LocalSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='yuanliu-http-tests-')
        cls.root = Path(cls.temp.name)
        (cls.root / 'index.html').write_text('PUBLIC_WORKSPACE')
        (cls.root / 'app.js').write_text('PUBLIC_SCRIPT')
        (cls.root / 'assets').mkdir()
        (cls.root / 'assets/yuanliu-favicon.svg').write_text('<svg/>')
        (cls.root / 'introduce').mkdir()
        (cls.root / 'introduce/index.html').write_text('PRIVATE_PLACEHOLDER')
        (cls.root / 'private.js').write_text('PRIVATE_PLACEHOLDER')
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(cls.root)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.temp.cleanup()

    def request(self, path='/', headers=None, method='GET', body=None):
        c = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=3)
        actual = {'Host': '127.0.0.1:4567', **(headers or {})}
        c.request(method, path, body=body, headers=actual)
        r = c.getresponse()
        result = r.status, dict(r.getheaders()), r.read()
        c.close()
        return result

    def test_public_workspace_assets_queries_and_head_still_work(self):
        for path in ['/', '/index.html?v=test', '/app.js?v=test', '/assets/yuanliu-favicon.svg']:
            status, headers, body = self.request(path)
            self.assertEqual(status, 200, path)
            self.assertTrue(body)
            self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
            self.assertEqual(headers['Cross-Origin-Resource-Policy'], 'same-origin')
            self.assertNotIn('Python', headers['Server'])
        status, _, body = self.request('/app.js', method='HEAD')
        self.assertEqual(status, 200)
        self.assertEqual(body, b'')

    def test_private_unknown_files_listings_and_traversal_are_not_served(self):
        for path in ['/introduce/', '/introduce/index.html', '/%69ntroduce/index.html', '/contact/',
                     '/brand-studio/', '/brand-guide.html', '/private.js', '/assets/', '/.env',
                     '/%2e%2e/index.html', '/assets/%2e%2e/index.html', '/index.html%00']:
            for method in ['GET', 'HEAD']:
                status, _, body = self.request(path, method=method)
                self.assertEqual(status, 404, path)
                self.assertNotIn(b'PRIVATE_PLACEHOLDER', body)

    def test_foreign_hosts_origins_frames_and_subresource_fetches_are_blocked(self):
        for headers in [{'Host': 'audit.invalid:4567'}, {'Origin': 'https://audit.invalid'},
                        {'Origin': 'null'}, {'Sec-Fetch-Site': 'cross-site'},
                        {'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate',
                         'Sec-Fetch-Dest': 'iframe', 'Sec-Fetch-User': '?1'}]:
            for path in ['/', '/app.js', '/api/model/session']:
                self.assertEqual(self.request(path, headers)[0], 403)
            self.assertEqual(self.request('/', headers, method='HEAD')[0], 403)

    def test_intentional_navigation_from_readme_works_but_cannot_access_api(self):
        nav = {'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate',
               'Sec-Fetch-Dest': 'document', 'Sec-Fetch-User': '?1'}
        self.assertEqual(self.request('/', nav)[0], 200)
        self.assertEqual(self.request('/api/model/session', nav)[0], 403)
        self.assertEqual(self.request('/', {**nav, 'Origin': 'https://audit.invalid'})[0], 403)

    def test_public_filenames_cannot_escape_through_symlinks(self):
        outside = self.root / 'private.js'
        script = self.root / 'app.js'
        script.unlink()
        try:
            script.symlink_to(outside)
            self.assertEqual(self.request('/app.js')[0], 404)
        finally:
            script.unlink()
            script.write_text('PUBLIC_SCRIPT')

    def test_health_session_and_gateway_contract_remain_available(self):
        status, _, body = self.request('/api/health')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)['version'], 4)
        status, headers, body = self.request('/api/model/session')
        self.assertEqual(status, 200)
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertTrue(json.loads(body)['token'])
        with patch.object(server_module.GATEWAY, 'call', return_value={'ok': True, 'model': 'test'}) as call:
            status, _, _ = self.request('/api/model/chat', {'Content-Type': 'application/json',
                'Origin': 'http://127.0.0.1:4567', 'X-Yuanliu-Session': 'test-session'}, 'POST', '{}')
            self.assertEqual(status, 200)
            call.assert_called_once_with('test-session', '/api/model/chat', {})
        self.assertEqual(self.request('/api/model/chat', {'Content-Type': 'application/json',
            'Origin': 'https://audit.invalid'}, 'POST', '{}')[0], 403)

    def test_public_manifest_covers_current_page_and_css_dependencies(self):
        for file in server_module.PUBLIC_FILES:
            self.assertTrue((ROOT / 'dist' / file).is_file(), file)
        index = (ROOT / 'dist/index.html').read_text()
        refs = re.findall(r'(?:src|href)="\./([^"?#]+)', index)
        for path in refs:
            self.assertIn(path, server_module.PUBLIC_FILES)
        for css in (ROOT / 'dist').glob('*.css'):
            if css.name not in server_module.PUBLIC_FILES:
                continue
            for path in re.findall(r'url\([\'"]?(?:\./)?(assets/[^)\'"?#]+)', css.read_text()):
                self.assertIn(path, server_module.PUBLIC_FILES, css.name)


if __name__ == '__main__':
    unittest.main()
