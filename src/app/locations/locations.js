// src/app/locations/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error cargando ubicaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLocation = async (id) => {
    try {
      // Aquí podrías añadir un endpoint DELETE si quieres
      console.log('Eliminar ubicación:', id);
      // Por ahora solo actualizamos el estado local
      setLocations(locations.filter(loc => loc.id !== id));
    } catch (error) {
      console.error('Error eliminando ubicación:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          📍 Ubicaciones Guardadas
        </h1>

        {locations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No hay ubicaciones guardadas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <div key={location.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800">
                      Coordenadas: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </h3>
                    <p className="text-gray-600 mt-2">{location.address}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Guardado: {new Date(location.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteLocation(location.id)}
                    className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link 
            href="/"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← Volver al Mapa
          </Link>
        </div>
      </div>
    </div>
  );
}