// src/types.ts
export interface RoutePoint {
    latitude: number;
    longitude: number;
    timestamp: string;
  }
  
  export interface VehicleState {
    currentIndex: number;
    isPlaying: boolean;
    elapsedTime: number;
    speed: number;
  }