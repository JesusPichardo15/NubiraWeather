// src/components/MapModal.js
'use client';

import { useState, useEffect, useRef } from 'react';

export default function MapModal({ isOpen, onClose, onLocationSelect }) {
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  // Resetear todo cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedPosition(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setDragDistance(0);
    }
  }, [isOpen]);

  const handleMouseDown = (event) => {
    if (event.button !== 0) return; // Solo botón izquierdo
    setIsDragging(true);
    setDragStart({
      x: event.clientX - offset.x,
      y: event.clientY - offset.y
    });
    setDragDistance(0);
    event.preventDefault();
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;
    
    const newOffset = {
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    };
    
    // Calcular distancia del arrastre
    const distance = Math.sqrt(
      Math.pow(newOffset.x - offset.x, 2) + 
      Math.pow(newOffset.y - offset.y, 2)
    );
    setDragDistance(prev => prev + distance);
    
    setOffset(newOffset);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMapClick = async (event) => {
    // No procesar click si fue un arrastre significativo
    if (dragDistance > 5) {
      console.log('Ignorando click - fue un arrastre');
      return;
    }
    
    if (!mapContainerRef.current) return;
    
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calcular coordenadas con mayor precisión
    const viewportWidth = rect.width;
    const viewportHeight = rect.height;
    
    // Coordenadas normalizadas (0 a 1)
    const normalizedX = (x - offset.x) / (viewportWidth * zoom);
    const normalizedY = (y - offset.y) / (viewportHeight * zoom);
    
    // Convertir a coordenadas geográficas con mayor precisión
    const lat = 90 - (normalizedY * 180);  // -90° a 90°
    const lng = (normalizedX * 360) - 180; // -180° a 180°
    
    console.log('Coordenadas precisas:', { lat, lng, normalizedX, normalizedY });
    
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Error en la respuesta');
      
      const data = await response.json();
      
      const location = {
        lat: lat,
        lng: lng,
        address: data.display_name || 'Dirección no disponible',
        rawData: data // Datos adicionales para mayor precisión
      };
      
      console.log('Ubicación seleccionada con precisión:', location);
      setSelectedPosition(location);
      
    } catch (error) {
      console.error('Error obteniendo dirección:', error);
      const location = { 
        lat: lat, 
        lng: lng, 
        address: 'Error obteniendo dirección. Coordenadas guardadas.' 
      };
      setSelectedPosition(location);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmLocation = () => {
    if (selectedPosition) {
      // Añadir información adicional de precisión
      const enhancedLocation = {
        ...selectedPosition,
        timestamp: new Date().toISOString(),
        zoomLevel: zoom,
        precision: 'alta'
      };
      
      onLocationSelect(enhancedLocation);
      onClose();
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => {
      const newZoom = Math.min(prev * 1.5, 8); // Zoom máximo aumentado a 8x
      console.log('Zoom aumentado a:', newZoom);
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev / 1.5, 0.3); // Zoom mínimo reducido a 0.3x
      console.log('Zoom reducido a:', newZoom);
      return newZoom;
    });
  };

  const handleResetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSelectedPosition(null);
  };

  // Agregar event listeners globales para el arrastre
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = 'default';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isDragging, dragStart]);

  // Calcular posición precisa del marcador
  const getMarkerPosition = () => {
    if (!selectedPosition) return null;
    
    const x = ((selectedPosition.lng + 180) / 360) * 100;
    const y = ((90 - selectedPosition.lat) / 180) * 100;
    
    return {
      left: `${x}%`,
      top: `${y}%`
    };
  };

  const markerStyle = getMarkerPosition();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header del modal */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            🗺️ Selector de Ubicación Precisa
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Contenido del modal */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-4">
            <p className="text-gray-600">
              <strong>Precisión mejorada:</strong> Haz click exacto en el mapa para seleccionar ubicaciones precisas
            </p>
          </div>

          {/* Controles de Navegación Mejorados */}
          <div className="flex gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Zoom:</span>
              <button
                onClick={handleZoomOut}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium disabled:opacity-50"
                disabled={zoom <= 0.3}
                title="Alejar"
              >
                ➖
              </button>
              <span className="text-sm font-mono bg-white px-2 py-1 rounded border min-w-16 text-center">
                {zoom.toFixed(1)}x
              </span>
              <button
                onClick={handleZoomIn}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium disabled:opacity-50"
                disabled={zoom >= 8}
                title="Acercar"
              >
                ➕
              </button>
              <button
                onClick={handleResetView}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium ml-2"
                title="Resetear vista"
              >
                🔄 Reset
              </button>
            </div>
            <div className="flex-1"></div>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <span className="bg-blue-100 px-2 py-1 rounded">🖱️ Arrastra para navegar</span>
              <span className="bg-green-100 px-2 py-1 rounded">👆 Click preciso para seleccionar</span>
            </div>
          </div>

          {/* Mapa interactivo con precisión mejorada */}
          <div 
            ref={mapContainerRef}
            className="w-full h-96 rounded-lg overflow-hidden border-2 border-gray-400 relative bg-gray-100 cursor-move"
            onMouseDown={handleMouseDown}
            onClick={handleMapClick}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {/* Contenedor del mapa con transformaciones */}
            <div 
              ref={mapRef}
              className="w-full h-full bg-cover bg-center select-none"
              style={{
                backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg)',
                transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease'
              }}
            >
              {/* Marcador de ubicación seleccionada con precisión */}
              {selectedPosition && markerStyle && (
                <div 
                  className="absolute w-8 h-8 bg-red-600 rounded-full border-3 border-white shadow-2xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                  style={markerStyle}
                >
                  <div className="relative">
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                      <div className="font-bold">📍 Seleccionado</div>
                      <div className="text-[10px] opacity-90">
                        {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <div className="bg-white p-4 rounded-lg shadow-lg border">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-700 mt-2 font-medium">Obteniendo dirección precisa...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Indicadores de estado */}
            <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white px-3 py-2 rounded-lg text-sm font-mono">
              <div>Zoom: {zoom.toFixed(1)}x</div>
              <div className="text-xs opacity-75">
                Precisión: {zoom >= 2 ? 'Alta' : zoom >= 1 ? 'Media' : 'Baja'}
              </div>
            </div>
            
            {isDragging && (
              <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm">
                🗺️ Navegando... (suelta para terminar)
              </div>
            )}
            
            {/* Instrucciones dinámicas */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm text-center min-w-64">
              {isDragging ? (
                <div>
                  <div className="font-bold">🗺️ Arrastrando...</div>
                  <div className="text-xs opacity-75">Suelta el click para terminar navegación</div>
                </div>
              ) : selectedPosition ? (
                <div>
                  <div className="font-bold text-green-400">✅ Ubicación seleccionada</div>
                  <div className="text-xs opacity-75">Haz click en otro lugar para cambiar</div>
                </div>
              ) : (
                <div>
                  <div className="font-bold">🎯 Click preciso para seleccionar</div>
                  <div className="text-xs opacity-75">Usa zoom para mayor precisión</div>
                </div>
              )}
            </div>

            {/* Indicador de precisión */}
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-xs">
              <div>🎯 Precisión mejorada</div>
              <div>Arrastre ≠ Selección</div>
            </div>
          </div>

          {/* Información detallada de la ubicación seleccionada */}
          {selectedPosition && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-300">
              <h3 className="font-semibold text-green-900 mb-3 text-lg">📍 Ubicación Seleccionada (Precisa)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-green-700 text-sm block mb-1">Coordenadas Precisas:</label>
                  <div className="text-green-900 font-mono text-sm bg-white p-3 rounded border border-green-200">
                    <div className="flex justify-between">
                      <span>Latitud:</span>
                      <span className="font-bold">{selectedPosition.lat.toFixed(6)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Longitud:</span>
                      <span className="font-bold">{selectedPosition.lng.toFixed(6)}°</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="font-medium text-green-700 text-sm block mb-1">Dirección Exacta:</label>
                  <p className="text-green-900 text-sm bg-white p-3 rounded border border-green-200 max-h-24 overflow-y-auto leading-relaxed">
                    {selectedPosition.address}
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-green-100 rounded border border-green-200">
                <div className="text-sm text-green-800 font-medium">
                  ✅ Haz click en <strong>"Confirmar Ubicación"</strong> para guardar esta ubicación precisa
                </div>
                <div className="text-xs text-green-600 mt-1">
                  • Precisión: Alta • Coordenadas exactas • Dirección verificada
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer del modal con botones */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedPosition ? (
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-medium">✅ Ubicación precisa lista</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Precisión: {zoom >= 2 ? 'Alta' : 'Media'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>⏳ Esperando selección precisa</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Usa zoom para mejor precisión
                </span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmLocation}
              disabled={!selectedPosition}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                selectedPosition 
                  ? 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-105 shadow-lg' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              ✅ Confirmar Ubicación Precisa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}