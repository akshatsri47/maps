// src/useVehicleTracker.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import type { RoutePoint, VehicleState } from '../types/Vehicle';

export const useVehicleTracker = () => {
  // State
  const [routeData, setRouteData] = useState<RoutePoint[]>([]);
  const [state, setState] = useState<VehicleState>({
    currentIndex: 0,
    isPlaying: false,
    elapsedTime: 0,
    speed: 0
  });
  const [mapZoom, setMapZoom] = useState(16);

  // Refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const animationRef = useRef<number | null>(null);
  const indexRef = useRef(0);

  // Load route data
  useEffect(() => {
    fetch('/dummyroute.json')
      .then(res => res.json())
      .then((data: RoutePoint[]) => setRouteData(data))
      .catch(err => console.error('Failed to load route:', err));
  }, []);

  // Responsive zoom
  useEffect(() => {
    const updateZoom = () => {
      const width = window.innerWidth;
      setMapZoom(width < 640 ? 14 : width < 1024 ? 15 : 16);
    };
    updateZoom();
    window.addEventListener('resize', updateZoom);
    return () => window.removeEventListener('resize', updateZoom);
  }, []);

  // Keep indexRef in sync
  useEffect(() => {
    indexRef.current = state.currentIndex;
  }, [state.currentIndex]);

  const calculateSpeed = useCallback((curr: RoutePoint, prev?: RoutePoint): number => {
    if (!prev) return 0;
    const dt = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
    if (dt <= 0) return 0;

    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(curr.latitude - prev.latitude);
    const dLng = toRad(curr.longitude - prev.longitude);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(toRad(prev.latitude)) * Math.cos(toRad(curr.latitude)) *
              Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distKm = R * c;

    return Math.round((distKm / dt) * 3600);
  }, []);

  const animateSegment = useCallback((): void => {
    if (!routeData.length) return;
    const i = indexRef.current;
    if (i >= routeData.length - 1) {
      setState(prev => ({ ...prev, isPlaying: false }));
      return;
    }

    const from = routeData[i];
    const to = routeData[i + 1];
    const start = performance.now();
    const duration = 1000;

    const step = (ts: number) => {
      const prog = Math.min((ts - start) / duration, 1);
      const lat = from.latitude + (to.latitude - from.latitude) * prog;
      const lng = from.longitude + (to.longitude - from.longitude) * prog;

      markerRef.current?.setPosition({ lat, lng });
      polyRef.current?.getPath().push(new google.maps.LatLng(lat, lng));
      mapRef.current?.panTo({ lat, lng });

      if (prog < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        const dtSec = (new Date(to.timestamp).getTime() - new Date(from.timestamp).getTime()) / 1000;
        setState(prev => ({
          ...prev,
          elapsedTime: prev.elapsedTime + dtSec,
          speed: calculateSpeed(to, from),
          currentIndex: prev.currentIndex + 1
        }));

        if (state.isPlaying) {
          animationRef.current = requestAnimationFrame(animateSegment);
        }
      }
    };

    animationRef.current = requestAnimationFrame(step);
  }, [routeData, calculateSpeed, state.isPlaying]);

  useEffect(() => {
    if (state.isPlaying) {
      animateSegment();
    } else if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.isPlaying, animateSegment]);

  const handlePlayPause = () => {
    if (routeData.length) setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleReset = () => {
    setState({ currentIndex: 0, isPlaying: false, elapsedTime: 0, speed: 0 });
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    if (markerRef.current && polyRef.current && mapRef.current && routeData.length) {
      const first = routeData[0];
      markerRef.current.setPosition({ lat: first.latitude, lng: first.longitude });
      polyRef.current.setPath([new google.maps.LatLng(first.latitude, first.longitude)]);
      mapRef.current.panTo({ lat: first.latitude, lng: first.longitude });
    }
  };

  const onLoadMap = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (routeData.length === 0) return;

    const first = routeData[0];
    map.panTo({ lat: first.latitude, lng: first.longitude });
    map.setZoom(mapZoom);

    const markerScale = window.innerWidth < 640 ? 6 : window.innerWidth < 1024 ? 7 : 8;
    const strokeWeight = window.innerWidth < 640 ? 3 : window.innerWidth < 1024 ? 3.5 : 4;

    markerRef.current = new google.maps.Marker({
      position: { lat: first.latitude, lng: first.longitude },
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: markerScale,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      zIndex: 1000,
    });

    polyRef.current = new google.maps.Polyline({
      path: [{ lat: first.latitude, lng: first.longitude }],
      geodesic: true,
      strokeColor: '#22c55e',
      strokeOpacity: 1.0,
      strokeWeight: strokeWeight,
      map,
    });
  }, [routeData, mapZoom]);

  return {
    routeData,
    state,
    mapZoom,
    onLoadMap,
    handlePlayPause,
    handleReset
  };
};