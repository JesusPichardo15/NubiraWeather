// Forwards POST to HF Space /clima, falls back to local simulation
export async function POST(request) {
  const debugPrefix = '[api/weather]';
  try {
    const body = await request.json();
    console.log(`${debugPrefix} Received:`, body);

    // Forward to our HF proxy which calls the Space
    try {
      const resp = await fetch(`/api/hf?path=/clima`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });

      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.includes('application/json')) {
        const data = await resp.json();
        console.log(`${debugPrefix} HF response OK`);
        return Response.json(data);
      } else {
        let upstream;
        try {
          upstream = contentType.includes('application/json') ? await resp.json() : await resp.text();
        } catch {
          upstream = await resp.text().catch(() => '');
        }
        console.warn(`${debugPrefix} HF upstream error`, { status: resp.status, upstream });
      }
    } catch (err) {
      console.warn(`${debugPrefix} HF proxy failed`, err);
    }

    // Fallback: local simulation to keep UX working
    const { latitude, longitude, day, month, year } = body;
    const baseTemp = 20 + Math.sin((latitude || 0) * Math.PI / 180) * 15;
    const seasonalVariation = month ? Math.sin((month - 1) * Math.PI / 6) * 10 : 0;
    const dayVariation = day ? Math.sin(day * Math.PI / 15) * 5 : 0;
    const tempMax = Math.round((baseTemp + seasonalVariation + dayVariation + Math.random() * 5) * 10) / 10;
    const tempMin = Math.round((tempMax - 8 - Math.random() * 5) * 10) / 10;
    const precipitation = Math.round((Math.abs(Math.sin((latitude || 0) * Math.PI / 180)) * 20 + Math.random() * 10) * 10) / 10;
    const windSpeed = Math.round((5 + Math.random() * 15 + Math.abs(Math.sin((longitude || 0) * Math.PI / 180)) * 5) * 10) / 10;

    const result = {
      temp_max: tempMax,
      temp_min: tempMin,
      precipitacion: precipitation,
      vel_viento: windSpeed,
      location: { latitude, longitude, day, month, year: year || 2025 },
      prediction_date: new Date().toISOString(),
      model_version: 'sim-fallback-1.0.0'
    };
    console.log(`${debugPrefix} Returning fallback`, result);
    return Response.json(result);

  } catch (error) {
    console.error(`${debugPrefix} Error:`, error);
    return Response.json(
      { error: 'Internal server error', detail: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ message: 'Weather Prediction API', version: '1.0.1', status: 'working' });
}

// Persist and retrieve last prediction for the UI
export const dynamic = 'force-dynamic';

export async function PUT(request) {
  try {
    const body = await request.json();
    const data = JSON.stringify(body, null, 2);
    // Save under /data/last_weather.json in project root
    const { promises: fs } = await import('fs');
    const path = (await import('path')).default;
    const filePath = path.join(process.cwd(), 'data', 'last_weather.json');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to save last weather', detail: String(err) }, { status: 500 });
  }
}

export async function HEAD() {
  // Helper for probing availability
  return new Response(null, { status: 200 });
}