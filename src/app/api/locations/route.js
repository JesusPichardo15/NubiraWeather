// src/app/api/locations/route.js
import { NextResponse } from 'next/server';

// 🧠 Memoria temporal (se borra al reiniciar el servidor)
let locations = [];

export async function POST(request) {
  try {
    const locationData = await request.json();

    if (typeof locationData.lat !== 'number' || typeof locationData.lng !== 'number') {
      return NextResponse.json(
        { error: 'Coordenadas inválidas o faltantes' },
        { status: 400 }
      );
    }

    const newLocation = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      lat: locationData.lat,
      lng: locationData.lng,
      address: locationData.address || 'Dirección no disponible',
      type: locationData.type || 'user_selection',
      date: locationData.date || null
    };

    locations.push(newLocation);
    console.log('✅ Nueva ubicación agregada:', newLocation);

    return NextResponse.json({
      success: true,
      message: 'Ubicación guardada correctamente',
      location: newLocation,
      totalLocations: locations.length
    });
  } catch (error) {
    console.error('❌ Error guardando ubicación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  console.log(`📨 Enviando ${locations.length} ubicaciones`);
  return NextResponse.json(locations);
}
