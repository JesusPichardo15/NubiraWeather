// src/app/page.js
'use client';

import { useState } from 'react';
import { callHF } from '../components/HFClient';
import ProfessionalMapModal from '../components/ProfessionalMapModal';

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showButton, setShowButton] = useState(true);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const sendLocationToServer = async (location) => {
    setIsLoading(true);
    try {
      let day = null;
      let month = null;
      let year = null;

      if (location.date) {
        const dateObj = new Date(location.date + 'T00:00:00');
        day = dateObj.getDate();
        month = dateObj.getMonth() + 1;
        year = dateObj.getFullYear();
      }

      const result = await callHF('https://jesus1558-nubira.hf.space/clima', {
        method: 'POST',
        body: {
          latitude: location.lat,
          longitude: location.lng,
          day: day || 15,
          month: month || 6,
          year: year || 2025
        },
        prediction_date: new Date().toISOString(),
        model_version: '1.0.0'
      });

      console.log('📍 Weather prediction generated:', result);
      
      setSelectedLocation(prev => ({
        ...prev,
        weatherPrediction: result
      }));
      try {
        const toPersistLocation = { ...location };
        const toPersistPrediction = result;
        localStorage.setItem('nubira.selectedLocation', JSON.stringify(toPersistLocation));
        localStorage.setItem('nubira.weatherPrediction', JSON.stringify(toPersistPrediction));
      } catch (e) {
        console.warn('Unable to persist prediction to localStorage', e);
      }
      
    } catch (error) {
      console.error('❌ Error generating weather prediction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = async (location) => {
    console.log('📍 Location selected:', location);
    setSelectedLocation(location);
    setShowButton(false);
    
    await sendLocationToServer(location);
  };

  return (
    <div className="min-h-screen flex items-center justify-center space-bg relative overflow-hidden">
      {/* Fondo animado de planetas y estrellas */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Planetas y estrellas (igual que antes) */}
        {/* ... */}
      </div>

      <div className="text-center z-10 relative">
        {showButton && (
          <button 
            onClick={handleOpenModal}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg text-xl font-semibold hover:bg-blue-700 transition transform duration-300 hover:scale-105 shadow-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            🗺 Open Professional Map
          </button>
        )}
        
        {isLoading && (
          <div className="bg-white/40 backdrop-blur-md p-4 rounded-lg shadow-lg mt-6 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-black font-medium">Sending location to server...</span>
            </div>
          </div>
        )}
        
        {selectedLocation && !isLoading && (
          <div className="bg-white/40 backdrop-blur-md p-6 rounded-lg shadow-lg mt-6 max-w-md mx-auto">
            <h3 className="font-semibold text-black text-lg mb-3 flex items-center justify-center gap-2">
              <span>✅</span>
              Location Confirmed
            </h3>
            <div className="text-left space-y-3">
              <div>
                <span className="font-medium text-black">Coordinates:</span>
                <div className="bg-gray-100/30 p-2 rounded mt-1 font-mono text-black">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
              </div>
              <div>
                <span className="font-medium text-black">Address:</span>
                <div className="bg-gray-100/30 p-2 rounded mt-1 text-sm text-black max-h-20 overflow-y-auto">
                  {selectedLocation.address}
                </div>
              </div>
              <div>
                <span className="font-medium text-black">Forecast Date:</span>
                <div className="bg-gray-100/30 p-2 rounded mt-1 text-sm text-black">
                  {selectedLocation.date
                    ? new Date(selectedLocation.date + 'T00:00:00').toLocaleDateString()
                    : 'Not selected'}
                </div>
              </div>

              {/* ❌ Se eliminó el bloque de Weather Prediction */}
            </div>
            
            <div className="flex gap-4 justify-center mt-4">
              <button 
                onClick={handleOpenModal}
                className="px-4 py-2 bg-blue-500/90 text-white rounded transition transform duration-300 hover:scale-105 hover:bg-blue-600/90 text-sm"
              >
                🗺 Change Location
              </button>
              <a
                href="/paginaRes"
                className="px-4 py-2 bg-purple-600/90 text-white rounded transition transform duration-300 hover:scale-105 hover:bg-purple-700/90 text-sm"
              >
                🔮 Weather Forecast
              </a>
            </div>
          </div>
        )}

        {!selectedLocation && !isLoading && (
          <div className="bg-white/40 backdrop-blur-md p-6 rounded-lg shadow-lg mt-6 max-w-md mx-auto">
            <div className="text-center text-black">
              <div className="text-4xl mb-2">🌎</div>
              <p className="font-medium">No location selected</p>
              <p className="text-sm mt-1">Click the button above to select a location on the professional map</p>
            </div>
          </div>
        )}
      </div>

      <ProfessionalMapModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onLocationSelect={handleLocationSelect}
      />
    </div>
  );
}
