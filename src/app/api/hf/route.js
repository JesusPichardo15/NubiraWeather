'use server';

// Generic proxy to forward requests to a Hugging Face Space (e.g., https://jesus1558-Nubira.hf.space)
// Configure base URL via process.env.HF_SPACE_BASE. Example: HF_SPACE_BASE="https://jesus1558-Nubira.hf.space"

const HF_SPACE_BASE = process.env.HF_SPACE_BASE;
const HF_DEFAULT_PATH = process.env.HF_DEFAULT_PATH || '/clima';

async function forward(request, method) {
  if (!HF_SPACE_BASE) {
    return new Response(
      JSON.stringify({ error: 'HF_SPACE_BASE env var is not set' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || HF_DEFAULT_PATH;
  const targetUrl = new URL(path, HF_SPACE_BASE).toString();

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.set('accept', headers.get('accept') || 'application/json');

  const init = { method, headers };

  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => undefined);
      init.body = body ? JSON.stringify(body) : undefined;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      const params = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        params.append(key, String(value));
      }
      init.body = params.toString();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      init.body = formData;
    } else {
      init.body = await request.arrayBuffer();
    }
  }

  try {
    const resp = await fetch(targetUrl, init);

    // If OK, stream back as-is
    if (resp.ok) {
      const okHeaders = new Headers(resp.headers);
      okHeaders.delete('content-encoding');
      okHeaders.delete('transfer-encoding');
      okHeaders.delete('connection');
      return new Response(resp.body, { status: resp.status, headers: okHeaders });
    }

    // On error, try to capture upstream payload for debugging
    const contentType = resp.headers.get('content-type') || '';
    let payload;
    try {
      payload = contentType.includes('application/json') ? await resp.json() : await resp.text();
    } catch {
      payload = await resp.text().catch(() => '');
    }

    const errorBody = {
      error: 'Upstream error',
      upstreamStatus: resp.status,
      upstreamUrl: targetUrl,
      method,
      payload,
    };

    return new Response(JSON.stringify(errorBody), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Proxy error', detail: String(err), targetUrl, method }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }
}

export async function GET(request) {
  return forward(request, 'GET');
}

export async function POST(request) {
  return forward(request, 'POST');
}

export async function PUT(request) {
  return forward(request, 'PUT');
}

export async function DELETE(request) {
  return forward(request, 'DELETE');
}


