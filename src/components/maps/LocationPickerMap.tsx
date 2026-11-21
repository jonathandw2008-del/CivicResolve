import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Navigation, X, AlertCircle } from 'lucide-react';
import { createLocationPickerIcon } from './mapIcons';

interface LocationPickerMapProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onLocationSelect: (coords: { lat: number; lng: number } | null) => void;
  disabled?: boolean;
}

// Default municipal center coordinates (Central Zone: 11.0168° N, 76.9558° E)
const DEFAULT_CENTER: [number, number] = [11.0168, 76.9558];

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 1 });
    }
  }, [center, map]);
  return null;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialLat,
  initialLng,
  onLocationSelect,
  disabled = false,
}) => {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    typeof initialLat === 'number' && typeof initialLng === 'number'
      ? { lat: initialLat, lng: initialLng }
      : null
  );

  const [flyToCenter, setFlyToCenter] = useState<[number, number] | null>(
    typeof initialLat === 'number' && typeof initialLng === 'number'
      ? [initialLat, initialLng]
      : null
  );

  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false);

  const handlePick = (lat: number, lng: number) => {
    if (disabled) return;
    const coords = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    };
    setSelectedCoords(coords);
    onLocationSelect(coords);
    setGeoError(null);
  };

  const handleClear = () => {
    if (disabled) return;
    setSelectedCoords(null);
    onLocationSelect(null);
    setGeoError(null);
  };

  const handleUseCurrentLocation = () => {
    if (disabled) return;
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const coords = { lat, lng };
        setSelectedCoords(coords);
        setFlyToCenter([lat, lng]);
        onLocationSelect(coords);
        setGeoLocating(false);
      },
      (err) => {
        setGeoLocating(false);
        if (err.code === 1) {
          setGeoError('Location permission denied. You can click on the map to pinpoint manually.');
        } else {
          setGeoError('Unable to retrieve location. Please pin directly on the map.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const markerPosition: [number, number] | null = selectedCoords
    ? [selectedCoords.lat, selectedCoords.lng]
    : null;

  const initialCenter: [number, number] = markerPosition || DEFAULT_CENTER;

  return (
    <div className="space-y-2">
      {/* Map toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-200 flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>Interactive Map Pin (Click to place or move)</span>
          </span>
          {selectedCoords && (
            <span className="px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 font-mono text-[11px] border border-teal-800">
              {selectedCoords.lat.toFixed(5)}°, {selectedCoords.lng.toFixed(5)}°
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={disabled || geoLocating}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#10243B] hover:bg-[#162A45] text-teal-300 border border-teal-500/30 text-xs font-bold transition-colors btn-press disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin' : ''}`} />
            <span>{geoLocating ? 'Acquiring GPS...' : 'Use My Location'}</span>
          </button>

          {selectedCoords && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
              title="Remove map pin"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Pin</span>
            </button>
          )}
        </div>
      </div>

      {geoError && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#071426] h-64 sm:h-72 w-full shadow-inner">
        {tileError && (
          <div className="absolute top-2 left-2 z-[1000] px-3 py-1.5 rounded-xl bg-rose-950/90 text-rose-200 border border-rose-500/30 text-[11px] flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Map tiles temporarily unavailable. Manual address fallback active.</span>
          </div>
        )}

        <MapContainer
          center={initialCenter}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileerror: () => setTileError(true),
              tileload: () => setTileError(false),
            }}
          />

          <MapClickHandler onPick={handlePick} />
          <MapCenterUpdater center={flyToCenter} />

          {markerPosition && (
            <Marker
              position={markerPosition}
              icon={createLocationPickerIcon()}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => {
                  const latLng = e.target.getLatLng();
                  handlePick(latLng.lat, latLng.lng);
                },
              }}
            />
          )}
        </MapContainer>

        {/* Overlay helper hint */}
        {!selectedCoords && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[1000] pointer-events-none">
            <div className="px-3 py-1.5 rounded-xl bg-[#0D1B2E]/90 backdrop-blur-md border border-slate-700/80 text-slate-300 text-[11px] flex items-center space-x-1.5 shadow-lg">
              <MapPin className="w-3.5 h-3.5 text-teal-400 animate-bounce" />
              <span>Click anywhere on the road or ward to place a precise GPS marker</span>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Placing a pin saves exact coordinates for municipal dispatch. If you cannot place a pin, entering the street address or landmark below will ensure your complaint is recorded properly.
      </p>
    </div>
  );
};
