// src/components/ProfessionalMapModal.js
'use client';

import { useState, useEffect } from 'react';

export default function ProfessionalMapModal({ isOpen, onClose, onLocationSelect }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [MapComponent, setMapComponent] = useState(null);

  useEffect(() => {
    setIsClient(true);
    
    // Load Leaflet only on client
    const loadLeaflet = async () => {
      try {
        // Dynamically import Leaflet and React-Leaflet
        const L = await import('leaflet');
        const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = await import('react-leaflet');
        
        // Fix for Leaflet icons
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Component to handle map clicks
        const LocationMarker = ({ onLocationSelect }) => {
          const [position, setPosition] = useState(null);

          const map = useMapEvents({
            click(e) {
              const { lat, lng } = e.latlng;
              const newLocation = { lat, lng };
              setPosition(newLocation);
              
              console.log('Map click:', lat, lng);
              
              // Get address using OpenStreetMap
              fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
                .then(response => response.json())
                .then(data => {
                  const locationWithAddress = {
                    ...newLocation,
                    address: data.display_name || 'Address not available'
                  };
                  console.log('Location with address:', locationWithAddress);
                  onLocationSelect(locationWithAddress);
                })
                .catch(error => {
                  console.error('Error getting address:', error);
                  onLocationSelect(newLocation);
                });
            },
          });

          return position === null ? null : (
            <Marker position={position}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold">📍 Selected Location</p>
                  <p className="text-sm text-gray-600">
                    {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        };
        // Main map component
        const MapWrapper = () => (
          <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-300">
            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker onLocationSelect={setSelectedLocation} />
            </MapContainer>
          </div>
        );

        setMapComponent(() => MapWrapper);
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    };

    if (isOpen) {
      loadLeaflet();
    }
  }, [isOpen]);

  const [forecastDate, setForecastDate] = useState('');

  const handleConfirmLocation = async () => {
    if (!forecastDate) {
      alert('❗ Please select a forecast date');
      return;
    }
    if (selectedLocation) {
    try {
      console.log('🚀 Sending location to backend...', selectedLocation);
      
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          address: selectedLocation.address,
          type: 'user_selection',
          date: forecastDate
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Location saved in backend:', result);
        // Show success message
        alert(`✅ Location saved successfully!`);
        onLocationSelect({ ...selectedLocation, date: forecastDate});
        onClose();
      } else {
        console.error('❌ Server error:', result);
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Connection error:', error);
      alert('❌ Server connection error');
    }
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            🗺️ Professional Map - Select Location
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-4">
            <p className="text-gray-600">
              <strong>Interactive professional map</strong> - Click anywhere to select a location
            </p>
          </div>
          
          {/* Leaflet Map */}
          {!isClient || !MapComponent ? (
            <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading professional map...</p>
              </div>
            </div>
          ) : (
            <MapComponent />
          )}

          {selectedLocation && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-3">📍 Selected Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-green-700 text-sm block mb-1">Coordinates:</label>
                  
                  <p className="text-black font-mono text-sm bg-white p-2 rounded border">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-green-700 text-sm block mb-1">Address:</label>
                  
                  <p className="text-black text-sm bg-white p-2 rounded border max-h-20 overflow-y-auto">
                    {selectedLocation.address}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-green-700 text-sm block mb-1">📅 Forecast Date:</label>
                  <input
                    type="date"
                    value={forecastDate}
                    onChange={(e) => setForecastDate(e.target.value)}
                    className="border text-black border-gray-300 rounded px-3 py-2 w-full max-w-xs"
                    min={new Date().toISOString().split('T')[0]} // fecha mínima = hoy
                    max={new Date(new Date().setFullYear(new Date().getFullYear() + 5))
                            .toISOString()
                            .split('T')[0]} // fecha máxima = hoy + 5 años
                  />
                </div>
              </div>
              
              <div className="mt-3 text-sm text-green-700">
                ✅ Location has been successfully selected
              </div>
            </div>
          )}

          {!selectedLocation && isClient && MapComponent && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-700 text-sm">
                💡 <strong>Instructions:</strong> Click anywhere on the map to select a location. 
                The marker will appear immediately.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedLocation ? (
              <span className="text-green-600 font-medium">✅ Location selected - Ready to confirm</span>
            ) : (
              <span>⏳ Waiting for map selection</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLocation}
              disabled={!selectedLocation}
              className={`px-6 py-2 rounded-lg font-medium transition-transform transition-colors duration-200 ${
                selectedLocation 
                  ? 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-105' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              ✅ Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}