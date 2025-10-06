'use server';

import { promises as fs } from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'last_weather.json');

export async function GET() {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const json = JSON.parse(data);
    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'No data', detail: String(err) }),
      { status: 404, headers: { 'content-type': 'application/json' } },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(body, null, 2));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to save', detail: String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}
