export interface ParsedLocationValue {
  address: string;
  latitude?: number;
  longitude?: number;
  hasCoordinates: boolean;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function capitalizeLocationQuery(query: string): string {
  return query
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\S+/g, (segment) => {
      const firstChar = segment.charAt(0);
      return firstChar
        ? `${firstChar.toLocaleUpperCase("it-IT")}${segment.slice(1)}`
        : segment;
    });
}

export function parseLocationValue(raw?: string | null): ParsedLocationValue {
  const input = raw?.trim() || "";

  if (!input) {
    return {
      address: "",
      hasCoordinates: false,
    };
  }

  const separatorIndex = input.indexOf("|");
  const queryPart =
    separatorIndex >= 0 ? input.slice(0, separatorIndex) : input;
  const coordinatesPart =
    separatorIndex >= 0 ? input.slice(separatorIndex + 1) : "";

  let latitude: number | undefined;
  let longitude: number | undefined;

  if (coordinatesPart.trim()) {
    try {
      const parsed = JSON.parse(coordinatesPart.trim()) as {
        latitude?: unknown;
        longitude?: unknown;
        lat?: unknown;
        lng?: unknown;
      };

      const parsedLatitude = parsed.latitude ?? parsed.lat;
      const parsedLongitude = parsed.longitude ?? parsed.lng;

      if (isFiniteNumber(parsedLatitude) && isFiniteNumber(parsedLongitude)) {
        latitude = parsedLatitude;
        longitude = parsedLongitude;
      }
    } catch {
      latitude = undefined;
      longitude = undefined;
    }
  }

  return {
    address: capitalizeLocationQuery(queryPart),
    latitude,
    longitude,
    hasCoordinates: isFiniteNumber(latitude) && isFiniteNumber(longitude),
  };
}

export function serializeLocationValue(location: {
  address?: string;
  latitude?: number;
  longitude?: number;
}): string {
  const address = capitalizeLocationQuery(location.address || "");

  if (!address) {
    return "";
  }

  if (isFiniteNumber(location.latitude) && isFiniteNumber(location.longitude)) {
    return `${address}|${JSON.stringify({
      latitude: location.latitude,
      longitude: location.longitude,
    })}`;
  }

  return address;
}

export function isLocationResolved(
  location?: {
    latitude?: number;
    longitude?: number;
  } | null,
): boolean {
  return (
    isFiniteNumber(location?.latitude) && isFiniteNumber(location?.longitude)
  );
}

export function getLocationCoordinatesKey(
  location?: {
    latitude?: number;
    longitude?: number;
  } | null,
): string | null {
  if (!isLocationResolved(location)) {
    return null;
  }

  return `${location.latitude!.toFixed(6)}|${location.longitude!.toFixed(6)}`;
}
