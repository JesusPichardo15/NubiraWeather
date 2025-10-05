'use client';

export async function callHF(path, { method = 'GET', headers = {}, body } = {}) {
  const url = `/api/hf?path=${encodeURIComponent(path)}`;

  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    if (typeof body === 'object' && !(body instanceof FormData) && !init.headers['content-type']) {
      init.headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    } else {
      init.body = body;
    }
  }

  const resp = await fetch(url, init);
  const contentType = resp.headers.get('content-type') || '';
  if (!resp.ok) {
    let detail = await resp.text().catch(() => '');
    try { detail = JSON.parse(detail); } catch {}
    throw new Error(`HF error ${resp.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }

  if (contentType.includes('application/json')) {
    return resp.json();
  }
  if (contentType.startsWith('text/')) {
    return resp.text();
  }
  return resp.arrayBuffer();
}


