"""Stateless local BYOK gateway. API keys are used for one request and never persisted."""
import http.client
import json
import re
import secrets
import socket
import threading
from urllib.parse import urlsplit

PROVIDERS = {'deepseek', 'siliconflow', 'zhipu', 'qwen', 'kimi', 'openai', 'compatible'}
TIERS = {'economy', 'balanced', 'quality'}


class GatewayError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def validate_config(data):
    if not isinstance(data, dict):
        raise GatewayError('模型配置格式不正确。')
    provider = str(data.get('provider', '')).strip()
    tier = str(data.get('tier', '')).strip()
    address = str(data.get('baseUrl', '')).strip().rstrip('/')
    model = str(data.get('model', '')).strip()
    key = str(data.get('apiKey', '')).strip()
    thinking = str(data.get('thinking', 'disabled')).strip()
    effort = str(data.get('reasoningEffort', 'low')).strip()
    if provider not in PROVIDERS:
        raise GatewayError('不支持的模型服务商。')
    if tier not in TIERS:
        raise GatewayError('不支持的质量档位。')
    parts = urlsplit(address)
    try:
        port = parts.port
    except ValueError:
        raise GatewayError('API 地址端口无效。')
    if (parts.scheme not in ('https', 'http') or not parts.hostname or parts.username or parts.password
            or parts.query or parts.fragment or any(c.isspace() for c in address)):
        raise GatewayError('请填写不含账号、查询参数的有效 API 地址。')
    if parts.scheme == 'http' and parts.hostname not in ('127.0.0.1', 'localhost', '::1'):
        raise GatewayError('远程模型地址必须使用 HTTPS；本机兼容服务可使用 HTTP。')
    if parts.hostname in ('127.0.0.1', 'localhost', '::1') and port == 4567:
        raise GatewayError('请填写模型服务地址，而非源流工作台地址。')
    if address.endswith('/chat/completions'):
        address = address[:-len('/chat/completions')]
    if not key or len(key) > 4096 or any(ord(c) < 33 or ord(c) > 126 for c in key):
        raise GatewayError('请填写有效的 API Key。本机无鉴权服务可填写 local。')
    if not model or len(model) > 160 or any(ord(c) < 32 for c in model):
        raise GatewayError('请填写有效的模型 ID，最多 160 个字符。')
    if thinking not in ('enabled', 'disabled'):
        raise GatewayError('思考模式配置无效。')
    if effort not in ('none', 'minimal', 'low', 'medium', 'high', 'max', 'xhigh'):
        raise GatewayError('推理强度配置无效。')
    return {'provider': provider, 'providerName': str(data.get('providerName', ''))[:80],
            'tier': tier, 'tierLabel': str(data.get('tierLabel', ''))[:20],
            'baseUrl': address, 'model': model, 'thinking': thinking,
            'reasoningEffort': effort, 'apiKey': key}


def endpoint(address):
    return address if address.endswith('/chat/completions') else address.rstrip('/') + '/chat/completions'


def provider_controls(config, is_test=False, response_schema=None):
    provider, thinking = config['provider'], config['thinking'] == 'enabled'
    fields = {}
    if provider == 'siliconflow':
        fields['enable_thinking'] = False if is_test else thinking
        if response_schema:
            fields['response_format'] = {'type': 'json_schema', 'json_schema': response_schema}
    elif provider == 'deepseek':
        enabled = False if is_test else thinking
        fields['thinking'] = {'type': 'enabled' if enabled else 'disabled'}
        if enabled:
            fields['reasoning_effort'] = config['reasoningEffort']
    elif provider == 'zhipu':
        enabled = False if is_test else thinking
        fields['thinking'] = {'type': 'enabled' if enabled else 'disabled'}
        if enabled:
            fields['reasoning_effort'] = config['reasoningEffort']
    elif provider == 'qwen':
        fields['reasoning_effort'] = 'none' if is_test else config['reasoningEffort']
    elif provider in ('kimi', 'openai'):
        fields['reasoning_effort'] = 'low' if is_test else config['reasoningEffort']
    return fields


def response_text(value):
    content = value.get('choices', [{}])[0].get('message', {}).get('content')
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        return '\n'.join(str(item.get('text', '')) for item in content if isinstance(item, dict)).strip()
    return ''


def safe_error(raw, key, status):
    defaults = {401: 'API Key 无效或已失效。', 403: '模型服务拒绝访问，请检查账户权限。',
                404: '未找到模型或接口，请检查模型 ID 和 API 地址。',
                429: '模型调用频率或额度受限，请稍后重试并检查服务商额度。',
                402: '模型账户额度不足，请检查服务商账户。'}
    if status in defaults:
        return defaults[status]
    message = ''
    try:
        value = json.loads(raw)
        error = value.get('error', {})
        message = error.get('message', '') if isinstance(error, dict) else str(error)
        message = message or str(value.get('message', ''))
    except (ValueError, AttributeError, TypeError):
        pass
    message = message.replace(key, '[已隐藏]') if key else message
    message = re.sub(r'(?i)bearer\s+[A-Za-z0-9._~+\-/=]+', 'Bearer [已隐藏]', message)
    return message[:300] or '模型服务暂时不可用，请稍后重试。'


def complete(config, messages, max_tokens=3000, timeout=60, is_test=False, response_schema=None):
    config = validate_config(config)
    target = endpoint(config['baseUrl'])
    parts = urlsplit(target)
    cls = http.client.HTTPSConnection if parts.scheme == 'https' else http.client.HTTPConnection
    conn = cls(parts.hostname, parts.port, timeout=timeout)
    token_field = 'max_completion_tokens' if config['provider'] == 'openai' else 'max_tokens'
    payload = {'model': config['model'], 'messages': messages, 'stream': False,
               token_field: max_tokens, **provider_controls(config, is_test, response_schema)}
    body = json.dumps(payload, ensure_ascii=False).encode()
    try:
        conn.request('POST', parts.path, body,
                     {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config['apiKey']})
        response = conn.getresponse()
        raw = response.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            raise GatewayError('模型返回内容过大，请缩小问题范围。', 502)
        if response.status != 200:
            raise GatewayError(safe_error(raw.decode('utf-8', 'replace'), config['apiKey'], response.status), 502)
        value = json.loads(raw)
        if value.get('choices', [{}])[0].get('finish_reason') == 'length':
            raise GatewayError('模型回复过长而被截断，请缩小问题后重试。', 502)
        content = response_text(value)
        if not content:
            raise ValueError('empty response')
        return content
    except GatewayError:
        raise
    except (TimeoutError, socket.timeout):
        raise GatewayError('模型响应超时，输入内容已保留，可稍后重试。', 504)
    except (OSError, http.client.HTTPException):
        raise GatewayError('无法连接模型服务，请检查网络和 API 地址。', 502)
    except (ValueError, KeyError, IndexError, TypeError):
        raise GatewayError('模型未返回有效文本，请检查接口是否兼容 Chat Completions。', 502)
    finally:
        conn.close()


def validate_messages(value):
    if not isinstance(value, list) or not value or len(value) > 20:
        raise GatewayError('消息格式不正确。')
    result = []
    for message in value:
        if not isinstance(message, dict) or message.get('role') not in ('system', 'user', 'assistant'):
            raise GatewayError('消息格式不正确。')
        content = message.get('content')
        if not isinstance(content, str) or not content.strip() or len(content) > 70000:
            raise GatewayError('消息内容为空或过长。')
        result.append({'role': message['role'], 'content': content})
    if len(json.dumps(result, ensure_ascii=False)) > 90000:
        raise GatewayError('参考内容过多，请缩小范围。')
    return result


class Gateway:
    def __init__(self):
        self.sessions = set()
        self.lock = threading.Lock()
        self.slots = threading.BoundedSemaphore(2)

    def new_session(self):
        token = secrets.token_urlsafe(32)
        with self.lock:
            if len(self.sessions) >= 512:
                self.sessions.pop()
            self.sessions.add(token)
        return {'token': token, 'keyStorage': 'browser-memory', 'registryReviewedAt': '2026-10-21'}

    def call(self, token, path, data):
        if token not in self.sessions:
            raise GatewayError('本机模型网关已重启，请刷新页面后重试。', 401)
        if not isinstance(data, dict):
            raise GatewayError('请求格式不正确。')
        if path == '/api/model/test':
            config = validate_config(data.get('config'))
            if not self.slots.acquire(blocking=False):
                raise GatewayError('已有模型请求正在处理，请稍后再试。', 429)
            try:
                content = complete(config, [{'role': 'user', 'content': '只回复：连接成功'}],
                                   max_tokens=512, timeout=120, is_test=True)
                return {'ok': True, 'content': content, 'model': config['model']}
            finally:
                self.slots.release()
        if path != '/api/model/chat':
            raise GatewayError('接口不存在。', 404)
        config = validate_config(data.get('config'))
        messages = validate_messages(data.get('messages'))
        try:
            max_tokens = int(data.get('maxTokens', 3000))
        except (TypeError, ValueError):
            raise GatewayError('输出长度设置无效。')
        if not 256 <= max_tokens <= 12000:
            raise GatewayError('输出长度需在 256–12000 tokens 之间。')
        schema = data.get('responseSchema')
        if schema is not None and (not isinstance(schema, dict) or len(json.dumps(schema)) > 12000):
            raise GatewayError('结构化输出规则无效。')
        if not self.slots.acquire(blocking=False):
            raise GatewayError('已有模型请求正在处理，请稍后再试。', 429)
        try:
            content = complete(config, messages, max_tokens=max_tokens, timeout=240,
                               response_schema=schema)
            return {'ok': True, 'content': content, 'model': config['model']}
        finally:
            self.slots.release()
