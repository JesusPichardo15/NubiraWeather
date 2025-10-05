// src/app/page.js
'use client';

import { useState } from 'react';
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
      // Procesar la fecha para dividirla en día, mes y año
      let day = null;
      let month = null;
      let year = null;

      if (location.date) {
        const dateObj = new Date(location.date + 'T00:00:00');
        day = dateObj.getDate();
        month = dateObj.getMonth() + 1; // Los meses van de 0 a 11, así que sumamos 1
        year = dateObj.getFullYear();
      }

      const response = await fetch('http://localhost:8000/clima', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          day: day,
          month: month,
          year: year
        })
      });

      if (!response.ok) {
        throw new Error('Error sending location to server');
      }

      const result = await response.json();
      console.log('📍 Location sent successfully:', result);
      
    } catch (error) {
      console.error('❌ Error sending location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = async (location) => {
    console.log('📍 Location selected:', location);
    setSelectedLocation(location);
    setShowButton(false);
    
    // Enviar la ubicación al servidor como JSON
    await sendLocationToServer(location);
  };

  return (
    <div className="min-h-screen flex items-center justify-center space-bg relative overflow-hidden">
      {/* Fondo animado de planetas y estrellas */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Planetas */}
        <div
          className="absolute rounded-full w-[50px] h-[50px] top-[10%] left-[5%] animate-move1 overflow-hidden z-5"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #fbbf24 70%, #f59e42 100%)',
          }}
        >
          <div
            className="w-full h-full rounded-full opacity-70"
            style={{
              background: `
                radial-gradient(circle at 20% 30%, rgba(139, 69, 19, 0.3) 0%, transparent 20%),
                radial-gradient(circle at 70% 60%, rgba(105, 105, 105, 0.4) 0%, transparent 25%),
                radial-gradient(circle at 40% 80%, rgba(178, 34, 34, 0.25) 0%, transparent 15%),
                radial-gradient(circle at 80% 20%, rgba(47, 79, 79, 0.35) 0%, transparent 18%),
                radial-gradient(circle at 60% 40%, rgba(160, 82, 45, 0.3) 0%, transparent 22%)
              `,
            }}
          ></div>
        </div>

        <div
          className="absolute rounded-full w-[30px] h-[30px] top-[70%] left-[80%] animate-move2 overflow-hidden z-5"
          style={{ background: 'radial-gradient(circle at 60% 60%, #60a5fa 70%, #2563eb 100%)' }}
        >
          <div
            className="w-full h-full rounded-full opacity-80"
            style={{
              background: `
                linear-gradient(90deg, 
                  transparent 0%, 
                  rgba(255,255,255,0.1) 10%, 
                  transparent 20%,
                  rgba(37, 99, 235, 0.3) 30%,
                  transparent 40%,
                  rgba(96, 165, 250, 0.4) 50%,
                  transparent 60%,
                  rgba(255,255,255,0.15) 70%,
                  transparent 80%,
                  rgba(37, 99, 235, 0.25) 90%,
                  transparent 100%
                ),
                radial-gradient(circle at 30% 40%, rgba(255,255,255,0.2) 0%, transparent 30%)
              `,
            }}
          ></div>
        </div>

        <div
          className="absolute rounded-full w-[40px] h-[40px] top-[40%] left-[60%] animate-move3 overflow-hidden z-5"
          style={{ background: 'radial-gradient(circle at 50% 50%, #a78bfa 70%, #7c3aed 100%)' }}
        >
          <div
            className="w-full h-full rounded-full opacity-60"
            style={{
              background: `
                radial-gradient(circle at 25% 35%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.4) 8%, transparent 12%),
                radial-gradient(circle at 65% 70%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 6%, transparent 10%),
                radial-gradient(circle at 45% 20%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.3) 5%, transparent 8%),
                radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 7%),
                radial-gradient(circle at 30% 80%, rgba(0,0,0,0.15) 0%, transparent 6%)
              `,
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)'
            }}
          ></div>
        </div>

        <div
          className="absolute rounded-full w-[20px] h-[20px] top-[80%] left-[20%] animate-move4 overflow-hidden z-5"
          style={{ background: 'radial-gradient(circle at 70% 70%, #34d399 70%, #059669 100%)' }}
        >
          <div
            className="w-full h-full rounded-full opacity-80"
            style={{
              background: `
                radial-gradient(circle at 40% 60%, rgba(220, 38, 38, 0.4) 0%, transparent 25%),
                radial-gradient(circle at 60% 30%, rgba(251, 146, 60, 0.3) 0%, transparent 20%),
                radial-gradient(circle at 20% 80%, rgba(120, 53, 15, 0.35) 0%, transparent 18%),
                radial-gradient(circle at 75% 65%, rgba(154, 52, 18, 0.4) 0%, transparent 15%)
              `,
            }}
          ></div>
        </div>

        {/* Estrellas */}
        {[...Array(24)].map((_, i) => (
          <div key={i} className={`star star-${i + 1} z-1`}></div>
        ))}
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