import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, MapPin, Clock, Gauge } from 'lucide-react';

const VehicleTracker = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const intervalRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  // Dummy route data - Hyderabad to surrounding areas
  const routeData = [
    { "latitude": 17.385044, "longitude": 78.486671, "timestamp": "2024-07-20T10:00:00Z" },
    { "latitude": 17.385045, "longitude": 78.486672, "timestamp": "2024-07-20T10:00:05Z" },
    { "latitude": 17.385050, "longitude": 78.486680, "timestamp": "2024-07-20T10:00:10Z" },
    { "latitude": 17.385060, "longitude": 78.486690, "timestamp": "2024-07-20T10:00:15Z" },
    { "latitude": 17.385080, "longitude": 78.486710, "timestamp": "2024-07-20T10:00:20Z" },
    { "latitude": 17.385120, "longitude": 78.486750, "timestamp": "2024-07-20T10:00:25Z" },
    { "latitude": 17.385180, "longitude": 78.486820, "timestamp": "2024-07-20T10:00:30Z" },
    { "latitude": 17.385260, "longitude": 78.486920, "timestamp": "2024-07-20T10:00:35Z" },
    { "latitude": 17.385360, "longitude": 78.487050, "timestamp": "2024-07-20T10:00:40Z" },
    { "latitude": 17.385480, "longitude": 78.487200, "timestamp": "2024-07-20T10:00:45Z" },
    { "latitude": 17.385620, "longitude": 78.487380, "timestamp": "2024-07-20T10:00:50Z" },
    { "latitude": 17.385780, "longitude": 78.487580, "timestamp": "2024-07-20T10:00:55Z" },
    { "latitude": 17.385960, "longitude": 78.487800, "timestamp": "2024-07-20T10:01:00Z" },
    { "latitude": 17.386160, "longitude": 78.488040, "timestamp": "2024-07-20T10:01:05Z" },
    { "latitude": 17.386380, "longitude": 78.488300, "timestamp": "2024-07-20T10:01:10Z" },
    { "latitude": 17.386620, "longitude": 78.488580, "timestamp": "2024-07-20T10:01:15Z" },
    { "latitude": 17.386880, "longitude": 78.488880, "timestamp": "2024-07-20T10:01:20Z" },
    { "latitude": 17.387160, "longitude": 78.489200, "timestamp": "2024-07-20T10:01:25Z" },
    { "latitude": 17.387460, "longitude": 78.489540, "timestamp": "2024-07-20T10:01:30Z" },
    { "latitude": 17.387780, "longitude": 78.489900, "timestamp": "2024-07-20T10:01:35Z" },
    { "latitude": 17.388120, "longitude": 78.490280, "timestamp": "2024-07-20T10:01:40Z" },
    { "latitude": 17.388480, "longitude": 78.490680, "timestamp": "2024-07-20T10:01:45Z" },
    { "latitude": 17.388860, "longitude": 78.491100, "timestamp": "2024-07-20T10:01:50Z" },
    { "latitude": 17.389260, "longitude": 78.491540, "timestamp": "2024-07-20T10:01:55Z" },
    { "latitude": 17.389680, "longitude": 78.492000, "timestamp": "2024-07-20T10:02:00Z" }
  ];

  const loadGoogleMapsScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      // Check if script is already being loaded
      if (scriptLoadedRef.current) {
        // Wait for existing script to load
        const checkLoaded = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkLoaded);
            resolve();
          }
        }, 100);
        return;
      }

      // Prevent multiple script loads
      scriptLoadedRef.current = true;

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAe2fSOH8e1D-5VP4F4cUGgxpcoC_fwlNA&libraries=geometry&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => {
        scriptLoadedRef.current = false;
        reject(new Error('Failed to load Google Maps'));
      };
      
      document.head.appendChild(script);
    });
  }, []);

  const initializeMap = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      await loadGoogleMapsScript();
      
      // Wait a bit for Google Maps to fully initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: routeData[0].latitude, lng: routeData[0].longitude },
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "transit",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Wait for map to be ready
      await new Promise(resolve => {
        const listener = map.addListener('idle', () => {
          window.google.maps.event.removeListener(listener);
          resolve();
        });
      });

      // Create vehicle marker using regular Marker (avoiding AdvancedMarker for now)
      vehicleMarkerRef.current = new window.google.maps.Marker({
        position: { lat: routeData[0].latitude, lng: routeData[0].longitude },
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        zIndex: 1000
      });

      // Create polyline for route
      routePolylineRef.current = new window.google.maps.Polyline({
        path: [{ lat: routeData[0].latitude, lng: routeData[0].longitude }],
        geodesic: true,
        strokeColor: '#22c55e',
        strokeOpacity: 1.0,
        strokeWeight: 4
      });
      routePolylineRef.current.setMap(map);

      setCurrentPosition(routeData[0]);
      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [loadGoogleMapsScript]);

  useEffect(() => {
    initializeMap();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [initializeMap]);

  const calculateSpeed = (current, previous) => {
    if (!current || !previous) return 0;
    
    const currentTime = new Date(current.timestamp);
    const previousTime = new Date(previous.timestamp);
    const timeDiff = (currentTime - previousTime) / 1000; // seconds
    
    if (timeDiff === 0) return 0;
    
    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (current.latitude - previous.latitude) * Math.PI / 180;
    const dLng = (current.longitude - previous.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(previous.latitude * Math.PI / 180) * Math.cos(current.latitude * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return Math.round((distance / timeDiff) * 3600); // Convert to km/h
  };

  const updateVehiclePosition = useCallback(() => {
    if (!mapLoaded || currentIndex >= routeData.length - 1) {
      setIsPlaying(false);
      return;
    }

    const newIndex = currentIndex + 1;
    const newPosition = routeData[newIndex];
    
    try {
      // Update marker position
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setPosition({
          lat: newPosition.latitude,
          lng: newPosition.longitude
        });
      }

      // Update polyline path
      if (routePolylineRef.current && window.google) {
        const path = routePolylineRef.current.getPath();
        path.push(new window.google.maps.LatLng(newPosition.latitude, newPosition.longitude));
      }

      // Center map on vehicle
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({
          lat: newPosition.latitude,
          lng: newPosition.longitude
        });
      }

      // Calculate speed
      const currentSpeed = calculateSpeed(newPosition, routeData[newIndex - 1]);
      
      setCurrentIndex(newIndex);
      setCurrentPosition(newPosition);
      setElapsedTime(prev => prev + 5);
      setSpeed(currentSpeed);
    } catch (error) {
      console.error('Error updating position:', error);
      setIsPlaying(false);
    }
  }, [currentIndex, mapLoaded]);

  useEffect(() => {
    if (isPlaying && mapLoaded) {
      intervalRef.current = setInterval(updateVehiclePosition, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, updateVehiclePosition, mapLoaded]);

  const handlePlayPause = () => {
    if (!mapLoaded) return;
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    if (!mapLoaded) return;
    
    setIsPlaying(false);
    setCurrentIndex(0);
    setElapsedTime(0);
    setSpeed(0);
    setCurrentPosition(routeData[0]);

    try {
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setPosition({
          lat: routeData[0].latitude,
          lng: routeData[0].longitude
        });
      }

      if (routePolylineRef.current) {
        routePolylineRef.current.setPath([
          { lat: routeData[0].latitude, lng: routeData[0].longitude }
        ]);
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({
          lat: routeData[0].latitude,
          lng: routeData[0].longitude
        });
      }
    } catch (error) {
      console.error('Error resetting:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (currentIndex / (routeData.length - 1)) * 100;

  return (
    <div className="w-full h-screen bg-gray-100 relative">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Map...</p>
          </div>
        </div>
      )}
      
      {/* Control Panel */}
      {mapLoaded && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-2xl p-4 min-w-96">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex justify-center items-center gap-4 mb-4">
            <button
              onClick={handlePlayPause}
              disabled={!mapLoaded}
              className={`p-3 rounded-full text-white font-semibold transition-all disabled:opacity-50 ${
                isPlaying ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <button
              onClick={handleReset}
              disabled={!mapLoaded}
              className="p-3 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-all disabled:opacity-50"
            >
              <RotateCcw size={20} />
            </button>
          </div>
          
          {/* Status Information */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
              <MapPin size={16} className="text-red-500 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-gray-500">Position</div>
                <div className="font-semibold text-xs truncate">
                  {currentPosition ? 
                    `${currentPosition.latitude.toFixed(6)}, ${currentPosition.longitude.toFixed(6)}` 
                    : 'Loading...'
                  }
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
              <Clock size={16} className="text-blue-500 flex-shrink-0" />
              <div>
                <div className="text-gray-500">Time</div>
                <div className="font-semibold">{formatTime(elapsedTime)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
              <Gauge size={16} className="text-green-500 flex-shrink-0" />
              <div>
                <div className="text-gray-500">Speed</div>
                <div className="font-semibold">{speed} km/h</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Badge */}
      {mapLoaded && (
        <div className="absolute top-6 left-6 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-semibold">
              {isPlaying ? 'Tracking Active' : 'Tracking Paused'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleTracker;