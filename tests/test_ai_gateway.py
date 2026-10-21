import json
import sys
import unittest
import importlib.util
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from ai_gateway import Gateway, GatewayError, validate_config, complete


MODELS = {
    'deepseek': ['deepseek-flash', 'deepseek-flash', 'deepseek-v4-pro'],
    'siliconflow': ['stepfun-ai/Step-3.5-Flash', 'Qwen/Qwen3.5-35B-A3B', 'Qwen/Qwen3.5-397B-A17B'],
    'zhipu': ['glm-4.7-flash', 'glm-5.3-flash', 'glm-5.3'],
    'qwen': ['qwen3.8-flash', 'qwen3.7-plus', 'qwen3.8-max'],
    'kimi': ['kimi-k2.6', 'kimi-k3', 'kimi-k3'],
    'openai': ['gpt-5-nano', 'gpt-5-mini', 'gpt-5.1'],
}
TIERS = ['economy', 'balanced', 'quality']


def config(provider='deepseek', tier='balanced', model=None, key='test-only-key'):
    index = TIERS.index(tier)
    bases = {'deepseek': 'https://api.deepseek.com', 'siliconflow': 'https://api.siliconflow.cn/v1',
             'zhipu': 'https://open.bigmodel.cn/api/paas/v4',
             'qwen': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
             'kimi': 'https://api.moonshot.cn/v1', 'openai': 'https://api.openai.com/v1'}
    return {'provider': provider, 'providerName': provider, 'tier': tier, 'tierLabel': tier,
            'baseUrl': bases.get(provider, 'https://example.test/v1'),
            'model': model or MODELS.get(provider, ['model'] * 3)[index],
            'thinking': 'disabled' if tier == 'economy' else 'enabled',
            'reasoningEffort': ['low', 'medium', 'high'][index], 'apiKey': key}


class FakeResponse:
    def __init__(self, status=200, body=None):
        self.status = status
        self.body = body or {'choices': [{'message': {'content': '{"text":"ok","action":null}'}, 'finish_reason': 'stop'}]}
    def read(self, _limit):
        return json.dumps(self.body).encode()


class FakeConnection:
    instances = []
    response = FakeResponse()
    def __init__(self, host, port, timeout):
        self.host, self.port, self.timeout, self.request_data = host, port, timeout, None
        self.__class__.instances.append(self)
    def request(self, method, path, body, headers):
        self.request_data = {'method': method, 'path': path, 'body': json.loads(body), 'headers': headers}
    def getresponse(self):
        return self.__class__.response
    def close(self):
        pass


class GatewayTests(unittest.TestCase):
    def setUp(self):
        FakeConnection.instances.clear();FakeConnection.response = FakeResponse()
        self.g = Gateway();self.token = self.g.new_session()['token']

    def test_gateway_keeps_no_connection_or_key_between_requests(self):
        with patch('ai_gateway.complete', return_value='连接成功') as remote:
            result = self.g.call(self.token, '/api/model/test', {'config': config()})
        self.assertTrue(result['ok']);self.assertNotIn('apiKey', json.dumps(result))
        self.assertFalse(hasattr(self.g, 'config'))
        self.assertEqual(self.g.new_session()['keyStorage'], 'browser-memory')
        remote.assert_called_once()

    def test_chat_forwards_normalized_messages_and_schema(self):
        messages = [{'role': 'system', 'content': 'system'}, {'role': 'user', 'content': 'hello'}]
        schema = {'name': 'answer', 'schema': {'type': 'object'}}
        with patch('ai_gateway.complete', return_value='{"text":"ok","action":null}') as remote:
            result = self.g.call(self.token, '/api/model/chat', {'config': config(), 'messages': messages,
                                                                  'maxTokens': 3000, 'responseSchema': schema})
        self.assertEqual(result['model'], 'deepseek-flash')
        self.assertEqual(remote.call_args.args[1], messages)
        self.assertEqual(remote.call_args.kwargs['response_schema'], schema)

    def test_all_six_providers_and_three_tiers_route_model_auth_tokens_and_controls(self):
        with patch('ai_gateway.http.client.HTTPSConnection', FakeConnection):
            for provider, models in MODELS.items():
                for tier, model in zip(TIERS, models):
                    cfg = config(provider, tier, model)
                    self.assertTrue(complete(cfg, [{'role': 'user', 'content': 'hello'}], response_schema={'name': 'x'}))
                    req = FakeConnection.instances[-1].request_data
                    self.assertEqual(req['headers']['Authorization'], 'Bearer test-only-key')
                    self.assertEqual(req['body']['model'], model)
                    token_field = 'max_completion_tokens' if provider == 'openai' else 'max_tokens'
                    self.assertIn(token_field, req['body'])
                    if provider == 'siliconflow': self.assertIn('enable_thinking', req['body'])
                    if provider in ('deepseek', 'zhipu'): self.assertIn('thinking', req['body'])
                    if provider in ('qwen', 'kimi', 'openai'): self.assertIn('reasoning_effort', req['body'])
        self.assertEqual(len(FakeConnection.instances), 18)

    def test_connection_test_uses_minimal_prompt_and_disables_expensive_thinking(self):
        with patch('ai_gateway.http.client.HTTPSConnection', FakeConnection):
            result = self.g.call(self.token, '/api/model/test', {'config': config('deepseek', 'quality')})
        body = FakeConnection.instances[-1].request_data['body']
        self.assertEqual(body['messages'], [{'role': 'user', 'content': '只回复：连接成功'}])
        self.assertEqual(body['thinking']['type'], 'disabled')
        self.assertTrue(result['ok'])

    def test_compatible_endpoint_requires_explicit_safe_values(self):
        cfg = config('compatible', model='my-model');cfg['baseUrl'] = 'https://example.test/v1'
        self.assertEqual(validate_config(cfg)['model'], 'my-model')
        for url in ['http://example.com', 'https://user:pass@example.com', 'https://example.com/?x=1',
                    'file:///tmp/key', 'http://127.0.0.1:4567']:
            with self.assertRaises(GatewayError): validate_config({**cfg, 'baseUrl': url})

    def test_invalid_sessions_messages_and_sizes_are_rejected(self):
        with self.assertRaises(GatewayError): self.g.call('bad', '/api/model/test', {'config': config()})
        with self.assertRaises(GatewayError): self.g.call(self.token, '/api/model/chat', {'config': config(), 'messages': []})
        with self.assertRaises(GatewayError): self.g.call(self.token, '/api/model/chat', {'config': config(), 'messages': [{'role':'user','content':'x'*70001}]})
        with self.assertRaises(GatewayError): self.g.call(self.token, '/api/model/chat', {'config': config(), 'messages': [{'role':'user','content':'x'}], 'maxTokens': 20})

    def test_remote_errors_never_echo_the_key(self):
        FakeConnection.response = FakeResponse(500, {'error': {'message': 'upstream saw test-only-key Bearer abc.def'}})
        with patch('ai_gateway.http.client.HTTPSConnection', FakeConnection):
            with self.assertRaises(GatewayError) as caught: complete(config(), [{'role':'user','content':'x'}])
        self.assertNotIn('test-only-key', str(caught.exception));self.assertNotIn('abc.def', str(caught.exception))

    def test_local_http_origin_and_host_checks(self):
        spec = importlib.util.spec_from_file_location('server', Path(__file__).resolve().parents[1] / 'scripts/serve-local.py')
        module = importlib.util.module_from_spec(spec);spec.loader.exec_module(module);trusted = module.WorkspaceHandler.trusted
        self.assertTrue(trusted(SimpleNamespace(headers={'Host':'localhost:4567','Origin':'http://localhost:4567'})))
        for headers in [{'Host':'evil.example:4567'}, {'Host':'localhost:4567','Origin':'https://evil.example'},
                        {'Host':'127.0.0.1:4567','Origin':'null'}, {'Host':'localhost:4567','Sec-Fetch-Site':'cross-site'}]:
            self.assertFalse(trusted(SimpleNamespace(headers=headers)))


if __name__ == '__main__': unittest.main()
