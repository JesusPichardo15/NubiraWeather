"use client";

import { useEffect } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const tiles = process.env.NEXT_PUBLIC_NUBIRA_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const osmAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const geoapifyAttributionText = ' | Powered by <a href="https://www.geoapify.com/">Geoapify</a>';
const icon = divIcon({
  className: "venue-pin",
  html: '<span></span>',
  iconSize: [28, 34],
  iconAnchor: [14, 34],
});

function MapControls({ position, focus, onPick }) {
  const map = useMap();
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng.wrap();
      onPick(lat, lng);
    },
  });
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ debounceMoveend: true }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    if (focus) map.setView([Math.min(85, Math.max(-85, focus.lat)), focus.lon], focus.zoom ?? Math.max(map.getZoom(), 8));
  }, [map, focus]);
  return position && <Marker position={[Math.max(-85, Math.min(85, position.lat)), position.lon]} icon={icon}
    title="Ubicación seleccionada" alt="Ubicación seleccionada" />;
}

export default function LocationMap({ position, focus, onPick, onTileError, geoapifyAttribution }) {
  return <MapContainer center={[23.6, -102.5]} zoom={5} scrollWheelZoom
    className="venue-map" aria-label="Mapa de ubicación del evento">
    <TileLayer url={tiles} attribution={osmAttribution + (geoapifyAttribution ? geoapifyAttributionText : "")}
      eventHandlers={{ tileerror: onTileError }} />
    <MapControls position={position} focus={focus} onPick={onPick} />
  </MapContainer>;
}
