import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  
  return null;
};