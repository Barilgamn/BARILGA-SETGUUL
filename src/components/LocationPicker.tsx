import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Loader2 } from 'lucide-react';

// Map for pinning the delivery spot: tap or drag the pin, or use the phone's
// location. OpenStreetMap tiles need no key. Loaded only when opened.

const UB: [number, number] = [47.9186, 106.9176];
const MONGOLIA: [number, number] = [46.8, 103.0];

// A CSS pin, so no marker images have to be bundled
const pin = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#0c0a09;border:3px solid #fbbf24;transform:rotate(-45deg);box-shadow:0 6px 14px rgba(0,0,0,.35)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface Props {
  lat: number | null;
  lng: number | null;
  inUlaanbaatar: boolean;
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ lat, lng, inUlaanbaatar, onChange }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  const place = (at: L.LatLng) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      markerRef.current = L.marker(at, { icon: pin, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current!.getLatLng();
        onChangeRef.current(p.lat, p.lng);
      });
    } else {
      markerRef.current.setLatLng(at);
    }
    onChangeRef.current(at.lat, at.lng);
  };

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const start: [number, number] = lat != null && lng != null ? [lat, lng] : inUlaanbaatar ? UB : MONGOLIA;
    const map = L.map(boxRef.current, { scrollWheelZoom: false }).setView(start, lat != null ? 16 : inUlaanbaatar ? 12 : 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    map.on('click', e => place(e.latlng));
    mapRef.current = map;
    if (lat != null && lng != null) {
      markerRef.current = L.marker([lat, lng], { icon: pin, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current!.getLatLng();
        onChangeRef.current(p.lat, p.lng);
      });
    }
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is set up once; later pins come from clicks and drags
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locate = () => {
    if (!navigator.geolocation) {
      setLocateError('Энэ төхөөрөмж байршил тодорхойлох боломжгүй байна.');
      return;
    }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        const at = L.latLng(pos.coords.latitude, pos.coords.longitude);
        mapRef.current?.setView(at, 17);
        place(at);
      },
      () => {
        setLocating(false);
        setLocateError('Байршлыг авч чадсангүй. Газрын зураг дээр дарж заана уу.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div ref={boxRef} className="h-64 sm:h-72 w-full bg-stone-200 z-0" />
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="absolute top-3 right-3 z-[400] inline-flex items-center gap-1.5 px-3 py-2 bg-white text-stone-950 text-xs font-semibold shadow-md border border-stone-300 hover:border-stone-950 disabled:opacity-70"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
          Миний байршил
        </button>
      </div>
      <p className="text-xs text-stone-500">
        {locateError || 'Хүргэх цэг дээр дарж тэмдэглээрэй. Тэмдгийг чирж байрлалыг нь засна.'}
      </p>
    </div>
  );
}
