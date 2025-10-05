'use client';

export async function callHF(pathOrUrl, { method = 'GET', headers = {}, body, basePath, absoluteUrl } = {}) {
  const urlParam = absoluteUrl || (pathOrUrl && /^(https?:)\/\//i.test(pathOrUrl) ? pathOrUrl : undefined);
  const effectivePath = !urlParam ? (basePath ? `${basePath}${pathOrUrl || ''}` : (pathOrUrl || '')) : '';
  const query = urlParam ? `url=${encodeURIComponent(urlParam)}` : `path=${encodeURIComponent(effectivePath)}`;
  const url = `/api/hf?${query}`;

  const init = { method, headers: { ...headers } };
  // Do not set token here; token is injected server-side by the proxy via env
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
    let detail;
    try {
      detail = contentType.includes('application/json') ? await resp.json() : await resp.text();
    } catch {
      detail = await resp.text().catch(() => '');
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  if (contentType.includes('application/json')) {
    return resp.json();
  }
  if (contentType.startsWith('text/')) {
    return resp.text();
  }
  return resp.arrayBuffer();
}


