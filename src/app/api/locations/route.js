// src/app/api/locations/route.js
import { promises as fs } from 'fs';
import path from 'path';

// Ruta al archivo JSON - se creará en la carpeta 'data' en la raíz del proyecto
const locationsFilePath = path.join(process.cwd(), 'data', 'locations.json');

// POST - Guardar nueva ubicación
export async function POST(request) {
  try {
    const locationData = await request.json();
    
    console.log('📨 Recibiendo ubicación:', locationData);
    
    // Validar datos básicos
    if (typeof locationData.lat !== 'number' || typeof locationData.lng !== 'number') {
      return Response.json({ 
        error: 'Coordenadas inválidas o faltantes',
        received: locationData 
      }, { status: 400 });
    }

    // Asegurar que el directorio 'data' existe
    try {
      await fs.mkdir(path.dirname(locationsFilePath), { recursive: true });
      console.log('✅ Directorio data creado/verificado');
    } catch (error) {
      console.error('❌ Error creando directorio:', error);
    }

    // Leer archivo existente o crear array vacío
    let locations = [];
    try {
      const fileData = await fs.readFile(locationsFilePath, 'utf8');
      locations = JSON.parse(fileData);
      console.log(`📖 Leyendo ${locations.length} ubicaciones existentes`);
    } catch (error) {
      // Archivo no existe, es normal la primera vez
      console.log('📝 Creando nuevo archivo de ubicaciones');
      locations = [];
    }

    // Crear nueva ubicación con ID y timestamp
    const newLocation = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      lat: locationData.lat,
      lng: locationData.lng,
      address: locationData.address || 'Dirección no disponible',
      type: locationData.type || 'user_selection',
      date: locationData.date || null
    };

    // Agregar al array
    // locations.push(newLocation);
   // console.log('➕ Nueva ubicación agregada:', newLocation);

    // Guardar en archivo JSON
    await fs.writeFile(locationsFilePath, JSON.stringify(newLocation, null, 2));
    console.log('💾 Archivo guardado correctamente');

    return Response.json({ 
      success: true, 
      message: 'Ubicación guardada correctamente',
      location: newLocation,
      //totalLocations: locations.length
    });

  } catch (error) {
    console.error('❌ Error guardando ubicación:', error);
    return Response.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}

// GET - Obtener todas las ubicaciones
export async function GET() {
  try {
    console.log('📨 Solicitando lista de ubicaciones');
    
    // Leer archivo de ubicaciones
    const fileData = await fs.readFile(locationsFilePath, 'utf8');
    const locations = JSON.parse(fileData);
    
    console.log(`📊 Enviando ${locations.length} ubicaciones`);
    
    return Response.json(locations);
    
  } catch (error) {
    // Si el archivo no existe, devolver array vacío
    console.log('📭 No hay ubicaciones guardadas aún');
    return Response.json([]);
  }
}