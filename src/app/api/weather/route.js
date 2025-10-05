export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Weather API received:', body);
    
    const { latitude, longitude, day, month, year } = body;

    // Simple weather prediction simulation
    const tempMax = Math.round((20 + Math.random() * 15) * 10) / 10;
    const tempMin = Math.round((tempMax - 8 - Math.random() * 5) * 10) / 10;
    const precipitation = Math.round(Math.random() * 20 * 10) / 10;
    const windSpeed = Math.round((5 + Math.random() * 15) * 10) / 10;

    const result = {
      temp_max: tempMax,
      temp_min: tempMin,
      precipitacion: precipitation,
      vel_viento: windSpeed,
      location: {
        latitude,
        longitude,
        day,
        month,
        year: year || 2025
      },
      prediction_date: new Date().toISOString(),
      model_version: '1.0.0'
    };

    console.log('Weather API returning:', result);
    return Response.json(result);

  } catch (error) {
    console.error('Weather prediction error:', error);
    return Response.json(
      { error: 'Internal server error', detail: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ 
    message: 'Weather Prediction API', 
    version: '1.0.0',
    status: 'working'
  });
}