import { MapPin } from 'lucide-react';
import { formatAddress, mapLink, PLACE_LABELS, PlaceType } from '../lib/places';

// One line for a stored delivery address, with the map pin if there is one
export function AddressSummary(props: {
  city?: string;
  district?: string;
  khoroo?: string;
  detail?: string;
  placeType?: PlaceType | string;
  lat?: number | null;
  lng?: number | null;
}) {
  const place = PLACE_LABELS[props.placeType as PlaceType];
  return (
    <span>
      {place && <span className="font-semibold">{place}: </span>}
      {formatAddress(props)}
      {props.lat != null && props.lng != null && (
        <a
          href={mapLink(props.lat, props.lng)}
          target="_blank"
          rel="noreferrer"
          className="ml-2 inline-flex items-center gap-0.5 font-semibold text-amber-700 hover:underline whitespace-nowrap"
        >
          <MapPin className="w-3.5 h-3.5" /> Газрын зураг
        </a>
      )}
    </span>
  );
}
