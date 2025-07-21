// src/VehicleTracker.tsx
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import { Play, Pause, RotateCcw, MapPin, Clock, Gauge } from 'lucide-react';
import { useVehicleTracker } from '../hooks/useVehicleTracker'
import type { RoutePoint } from '../types/Vehicle';

const libraries: Libraries = ['geometry'];

const containerStyle = { width: '100%', height: '100%' };

// Simple UI Components
const StatusBadge = ({ isActive }: { isActive: boolean }) => (
  <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-white rounded-lg shadow-lg p-2 md:p-3">
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}/>
      <span className="text-xs md:text-sm font-semibold">{isActive ? 'Active' : 'Paused'}</span>
    </div>
  </div>
);

const ControlPanel = ({ 
  state, 
  routeData, 
  onPlayPause, 
  onReset 
}: {
  state: any;
  routeData: RoutePoint[];
  onPlayPause: () => void;
  onReset: () => void;
}) => {
  if (!routeData.length) return null;
  
  const progress = (state.currentIndex / (routeData.length - 1)) * 100;
  const currentPoint = routeData[state.currentIndex];
  
  const formatTime = (s: number) => {
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const sec = (s%60).toString().padStart(2,'0');
    return `${m}:${sec}`;
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 bg-white rounded-2xl shadow-2xl p-3 md:p-4 md:min-w-96 md:max-w-lg">
      {/* Progress bar */}
      <div className="mb-3 md:mb-4">
        <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
          <div
            className="bg-blue-500 h-1.5 md:h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex justify-center items-center gap-3 md:gap-4 mb-3 md:mb-4">
        <button
          onClick={onPlayPause}
          className={`p-2.5 md:p-3 rounded-full text-white font-semibold transition-all ${
            state.isPlaying ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {state.isPlaying ? <Pause size={18} className="md:w-5 md:h-5"/> : <Play size={18} className="md:w-5 md:h-5"/>}
        </button>
        <button
          onClick={onReset}
          className="p-2.5 md:p-3 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-all"
        >
          <RotateCcw size={18} className="md:w-5 md:h-5"/>
        </button>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm">
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg sm:col-span-1">
          <MapPin size={14} className="text-red-500 flex-shrink-0 md:w-4 md:h-4"/>
          <div className="min-w-0 flex-1">
            <div className="text-gray-500 text-xs">Position</div>
            <div className="font-semibold text-xs truncate">
              {`${currentPoint.latitude.toFixed(4)}, ${currentPoint.longitude.toFixed(4)}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
          <Clock size={14} className="text-blue-500 flex-shrink-0 md:w-4 md:h-4"/>
          <div className="flex-1">
            <div className="text-gray-500 text-xs">Elapsed</div>
            <div className="font-semibold">{formatTime(state.elapsedTime)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
          <Gauge size={14} className="text-green-500 flex-shrink-0 md:w-4 md:h-4"/>
          <div className="flex-1">
            <div className="text-gray-500 text-xs">Speed</div>
            <div className="font-semibold">{state.speed} km/h</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VehicleTracker = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  const { routeData, state, mapZoom, onLoadMap, handlePlayPause, handleReset } = useVehicleTracker();

  if (loadError) return <div>Error loading map</div>;
  if (!isLoaded || !routeData.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-100 relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        zoom={mapZoom}
        center={{ lat: routeData[0].latitude, lng: routeData[0].longitude }}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: window.innerWidth >= 768,
          gestureHandling: window.innerWidth < 640 ? 'cooperative' : 'auto',
          styles: [
            { featureType:'poi', elementType:'labels', stylers:[{visibility:'off'}] },
            { featureType:'transit', elementType:'labels', stylers:[{visibility:'off'}] }
          ]
        }}
        onLoad={onLoadMap}
      />

      <StatusBadge isActive={state.isPlaying} />
      <ControlPanel 
        state={state}
        routeData={routeData}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
      />
    </div>
  );
};

export default VehicleTracker;