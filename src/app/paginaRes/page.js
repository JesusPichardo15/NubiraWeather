"use client"
import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components for bar chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const EnhancedWeatherPage = () => {
  const [weatherType, setWeatherType] = useState('normal');
  const [minTemperature, setMinTemperature] = useState(15);
  const [maxTemperature, setMaxTemperature] = useState(25);
  const [precipitation, setPrecipitation] = useState(0);
  const [windSpeed, setWindSpeed] = useState(5);
  const [address, setAddress] = useState('Loading location...');
  const [forecastDate, setForecastDate] = useState('');
  const [weatherHistory, setWeatherHistory] = useState([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [persistedLoaded, setPersistedLoaded] = useState(false);

  // Determine weather type
  const getWeatherTypeFromConditions = (minTemp, maxTemp, precip, wind) => {
    const avgTemp = (minTemp + maxTemp) / 2;
    if (precip > 70 && wind > 30 && avgTemp > 15) return 'thunderstorm';
    if (precip > 60 && maxTemp <= 5) return 'hail';
    if (precip > 50 && maxTemp <= 0) return 'snowy';
    if (maxTemp >= 30) return 'sunny';
    if (maxTemp >= 20 && minTemp >= 10) return 'normal';
    if (maxTemp >= 15 && minTemp >= 5) return 'cloudy';
    if (precip > 30) return 'rainy';
    return 'cloudy';
  };

  // Simulate backend data (precipitation in mm)
  const simulateBackendData = () => {
    const baseTemps = [-5, -2, 0, 2, 5, 8, 12, 15, 18, 22, 25, 28, 32, 35];
    const baseTemp = baseTemps[Math.floor(Math.random() * baseTemps.length)];
    const tempDifference = Math.floor(Math.random() * 8) + 3;
    const randomMinTemp = baseTemp - Math.floor(tempDifference / 2);
    const randomMaxTemp = baseTemp + Math.ceil(tempDifference / 2);
    const randomPrecip = Math.floor(Math.random() * 101); // 0-100 mm
    const randomWind = Math.floor(Math.random() * 51);

    const addresses = [
      'Mexico City, CDMX',
      'Guadalajara, Jalisco',
      'Monterrey, Nuevo León',
      'Puebla, Puebla',
      'Cancún, Quintana Roo',
      'Mérida, Yucatán',
      'Tijuana, Baja California',
      'Leon, Guanajuato'
    ];
    const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];

    return {
      minTemp: randomMinTemp,
      maxTemp: randomMaxTemp,
      precip: randomPrecip,
      wind: randomWind,
      address: randomAddress,
      timestamp: new Date().toLocaleTimeString(),
      id: Date.now() + Math.random()
    };
  };

  // Chart data
  const getChartData = () => {
    const maxSamples = 5;
    const currentSamples = weatherHistory.slice(-maxSamples);

    const labels = currentSamples.map((data, index) => {
      const globalIndex = weatherHistory.length - maxSamples + index + 1;
      return `S${globalIndex}`;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Min Temp (°C)',
          data: currentSamples.map(data => Number((data.minTemp).toFixed(1))),
          backgroundColor: 'rgba(100, 149, 237, 0.8)',
          borderColor: 'rgb(70, 130, 180)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: 'Max Temp (°C)',
          data: currentSamples.map(data => Number((data.maxTemp).toFixed(1))),
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: 'Precipitation (mm)',
          data: currentSamples.map(data => Number((data.precip).toFixed(1))),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1,
          yAxisID: 'y1',
        },
        {
          label: 'Wind (km/h)',
          data: currentSamples.map(data => Number((data.wind).toFixed(1))),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1,
          yAxisID: 'y2',
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'white' } },
      y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'white' }, title: { display: true, text: 'Temperature (°C)', color: 'white' } },
      y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: 'white' }, title: { display: true, text: 'Precipitation (mm)', color: 'white' }, max: 100 },
      y2: { type: 'linear', display: false }
    },
    plugins: {
      legend: { position: 'top', labels: { color: 'white', font: { size: 12 } } },
      title: { display: true, text: `Prediction Graphics`, color: 'white', font: { size: 16, weight: 'bold' } },
      tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: 'white', bodyColor: 'white', borderColor: 'rgba(255, 255, 255, 0.2)', borderWidth: 1 }
    },
    animation: { duration: 800, easing: 'easeOutQuart' }
  };

  useEffect(() => {
    // First, attempt to load persisted selection and prediction
    try {
      const rawLoc = localStorage.getItem('nubira.selectedLocation');
      const rawPred = localStorage.getItem('nubira.weatherPrediction');
      if (rawLoc && rawPred) {
        const loc = JSON.parse(rawLoc);
        const pred = JSON.parse(rawPred);
        const minT = typeof pred.temp_min === 'number' ? pred.temp_min : (pred.temp_min || pred.tempMin || 15);
        const maxT = typeof pred.temp_max === 'number' ? pred.temp_max : (pred.temp_max || pred.tempMax || 25);
        const precip = typeof pred.precipitacion === 'number' ? pred.precipitacion : (pred.precipitation || pred.precip || 0);
        const wind = typeof pred.vel_viento === 'number' ? pred.vel_viento : (pred.windSpeed || pred.wind || 5);
        const addr = loc.address || 'Selected location';
        const dateStr = loc.date
          ? new Date(loc.date + 'T00:00:00').toLocaleDateString()
          : (pred.location && pred.location.day && pred.location.month && pred.location.year
              ? new Date(`${pred.location.year}-${String(pred.location.month).padStart(2,'0')}-${String(pred.location.day).padStart(2,'0')}T00:00:00`).toLocaleDateString()
              : '');

        setMinTemperature(minT);
        setMaxTemperature(maxT);
        setPrecipitation(precip);
        setWindSpeed(wind);
        setAddress(addr);
        setForecastDate(dateStr);
        setWeatherType(getWeatherTypeFromConditions(minT, maxT, precip, wind));
        setSampleCount(1);
        setWeatherHistory([{ minTemp: minT, maxTemp: maxT, precip, wind, address: addr, timestamp: new Date().toLocaleTimeString(), id: Date.now() }]);
        setPersistedLoaded(true);
        return;
      }
    } catch (e) {
      // If parsing fails, fall through to simulation
    }

    const updateWeatherData = () => {
      const newData = simulateBackendData();
      setMinTemperature(newData.minTemp);
      setMaxTemperature(newData.maxTemp);
      setPrecipitation(newData.precip);
      setWindSpeed(newData.wind);
      setAddress(newData.address);
      setWeatherType(getWeatherTypeFromConditions(newData.minTemp, newData.maxTemp, newData.precip, newData.wind));
      setSampleCount(prev => prev + 1);
      setWeatherHistory(prev => [...prev, newData]);
    };

    updateWeatherData();
    const interval = setInterval(updateWeatherData, 5000);
    return () => clearInterval(interval);
  }, []);

  const weatherConfig = {
    normal: { background: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600', icon: '⛅', name: 'Normal Day', description: 'Clear sky with some clouds', tempRange: '20-29°C', textColor: 'text-white' },
    sunny: { background: 'bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500', icon: '☀️', name: 'Hot Day', description: 'Intense sunlight and warm weather', tempRange: '30°C+', textColor: 'text-white' },
    cloudy: { background: 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600', icon: '☁️', name: 'Cloudy Day', description: 'Cloud covered sky', tempRange: '15-19°C', textColor: 'text-white' },
    rainy: { background: 'bg-gradient-to-br from-blue-600 via-blue-700 to-gray-800', icon: '🌧️', name: 'Rainy Day', description: 'Persistent precipitation throughout the day', tempRange: '5-14°C', textColor: 'text-white' },
    snowy: { background: 'bg-gradient-to-br from-blue-100 via-blue-200 to-white', icon: '❄️', name: 'Snowy Day', description: 'Snow falling and cold temperatures', tempRange: 'Below 0°C', textColor: 'text-gray-800' },
    hail: { background: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-600', icon: '🌨️', name: 'Hail Storm', description: 'Falling ice pellets, be careful!', tempRange: '0-5°C', textColor: 'text-gray-800' },
    thunderstorm: { background: 'bg-gradient-to-br from-purple-800 via-gray-900 to-black', icon: '⛈️', name: 'Thunderstorm', description: 'Heavy rain with lightning and thunder', tempRange: '15°C+', textColor: 'text-white' }
  };

  const currentWeather = weatherConfig[weatherType];

  return (
    <div className={`min-h-screen transition-all duration-1000 ${currentWeather.background}`}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white text-center mb-2">Nubira</h1>
        <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto">
          <div className="flex-1">
            <div className="bg-white/30 backdrop-blur-lg rounded-2xl p-8 border border-white/40 shadow-xl">
              <div className="text-center">
                <div className="mb-6 p-3 bg-black/20 rounded-lg backdrop-blur-sm">
                  <div className="opacity-80 text-sm text-white">Current Location</div>
                  <div className="text-white font-bold text-lg">{address}</div>
                  {forecastDate && (
                    <div className="opacity-80 text-xs text-white mt-1">Forecast Date: {forecastDate}</div>
                  )}
                </div>
                <div className="text-6xl mb-4">{currentWeather.icon}</div>
                <h2 className={`text-3xl font-bold mb-2 ${currentWeather.textColor}`}>{currentWeather.name}</h2>
                <div className="flex justify-center items-center gap-6 my-4">
                  <div className="text-center">
                    <div className={`text-sm opacity-80 ${currentWeather.textColor}`}>Min</div>
                    <div className={`text-3xl font-bold ${currentWeather.textColor}`}>{minTemperature.toFixed(1)}°C</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-sm opacity-80 ${currentWeather.textColor}`}>Max</div>
                    <div className={`text-3xl font-bold ${currentWeather.textColor}`}>{maxTemperature.toFixed(1)}°C</div>
                  </div>
                </div>
                <p className={`opacity-90 mb-2 ${currentWeather.textColor}`}>{currentWeather.description}</p>
                <p className={`opacity-80 text-sm mb-4 ${currentWeather.textColor}`}>Typical range: {currentWeather.tempRange}</p>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-black/20 rounded-lg p-3 text-white backdrop-blur-sm">
                    <div className="opacity-80 text-sm">Precipitation</div>
                    <div className="text-xl font-bold">{precipitation.toFixed(1)} mm</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3 text-white backdrop-blur-sm">
                    <div className="opacity-80 text-sm">Wind Speed</div>
                    <div className="text-xl font-bold">{windSpeed.toFixed(1)} km/h</div>
                  </div>
                </div>
                {(weatherType === 'thunderstorm' || weatherType === 'hail') && (
                  <div className="mt-4 p-3 bg-red-500/70 rounded-lg backdrop-blur-sm">
                    <p className="text-white font-bold text-sm">
                      ⚠️ {weatherType === 'thunderstorm' ? 'Lightning danger - Seek shelter' : 'Hail warning - Protect yourself'}
                    </p>
                  </div>
                )}
                {weatherType === 'snowy' && (
                  <div className="mt-4 p-3 bg-blue-500/70 rounded-lg backdrop-blur-sm">
                    <p className="text-white font-bold text-sm">❄️ Cold weather alert - Dress warmly</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              {weatherHistory.length > 0 ? (
                <div>
                  <Bar data={getChartData()} options={chartOptions} />
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-blue-500/20 rounded-lg p-3 text-center">
                      <div className="text-white text-sm">Current Min Temp</div>
                      <div className="text-white font-bold text-lg">{minTemperature.toFixed(1)}°C</div>
                    </div>
                    <div className="bg-red-500/20 rounded-lg p-3 text-center">
                      <div className="text-white text-sm">Current Max Temp</div>
                      <div className="text-white font-bold text-lg">{maxTemperature.toFixed(1)}°C</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-blue-500/20 rounded-lg p-3 text-center">
                      <div className="text-white text-sm">Current Precip.</div>
                      <div className="text-white font-bold text-lg">{precipitation.toFixed(1)} mm</div>
                    </div>
                    <div className="bg-green-500/20 rounded-lg p-3 text-center">
                      <div className="text-white text-sm">Current Wind</div>
                      <div className="text-white font-bold text-lg">{windSpeed.toFixed(1)} km/h</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-white text-lg">Loading weather data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedWeatherPage;
