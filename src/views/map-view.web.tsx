import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Image, useWindowDimensions } from 'react-native';
import { Pressable } from '@/src/components/core/interactive';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { useQueryClient } from '@tanstack/react-query';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { webPanelBackground } from '@/src/constants/theme';
import { useAuthContext, useDataContext } from '@/src/state';
import type { Movement } from '@/src/types/models';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import IconSymbol from '@/src/components/ui/icon-symbol';
import { MovementHelper } from '@/src/helpers/MovementHelper';
import { TransactionsApiHelper } from '@/src/helpers/TransactionsApiHelper';
import { TransactionsMutationHelpers } from '@/src/helpers/TransactionsMutationHelpers';
import { formatDateForDisplay, compareDates } from '@/src/utils/dateUtils';
import {
  getLocationCoordinatesKey,
  parseLocationValue,
  serializeLocationValue,
} from '@/src/utils/locationValue';

const LIBRARIES: 'places'[] = ['places'];
const DEFAULT_CENTER = { lat: 39.2238, lng: 9.1217 };
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY || '';
const BACKFILL_BATCH_SIZE = 25;
const GEOCODE_BATCH_SIZE = 10;
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1f1f1f' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8f949d' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1f1f1f' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#3a3a3a' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#242424' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1e3027' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#252525' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3b3b3b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2f2f2f' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a2a' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f2c38' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5f8ea0' }],
  },
];

interface LocationGroup {
  location: string;
  lat: number;
  lng: number;
  movements: Movement[];
}

interface MapViewProps {
  onBack: () => void;
}

/**
 * Full-screen map view showing all movement locations as markers.
 * Clicking a marker smoothly pans the map and opens a bottom-left panel.
 */
export default function MapView({ onBack }: MapViewProps) {
  const queryClient = useQueryClient();
  const { selectedSpreadsheetId } = useAuthContext();
  const { movements, categories } = useDataContext();
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor(webPanelBackground, 'cardBackground');
  const textColor = useThemeColor({ light: '#18221D', dark: '#F0F4F2' }, 'text');
  const subtextColor = useThemeColor({ light: '#66736C', dark: '#AEB8B2' }, 'tabIconDefault');
  const borderColor = useThemeColor(
    { light: 'rgba(23, 38, 31, 0.10)', dark: 'rgba(255, 255, 255, 0.10)' },
    'cardBorder',
  );
  const positiveAmountColor = useThemeColor({ light: '#25633F', dark: '#7FCF9D' }, 'tint');
  const brandColor = useThemeColor({ light: '#244437', dark: '#D6E8DE' }, 'tint');
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const primaryColor = '#2F4F3F';

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
    language: 'it',
    region: 'IT',
  });

  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [locationGroups, setLocationGroups] = useState<LocationGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<LocationGroup | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [initialCenter] = useState(DEFAULT_CENTER);
  const [initialZoom] = useState(6);
  const geocodeCache = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const pendingBackfills = useRef<Set<string>>(new Set());

  const backfillLocations = useCallback(
    async (updates: Array<{ movementId: string; location: string }>) => {
      if (!selectedSpreadsheetId || updates.length === 0) {
        return;
      }

      const uniqueUpdates = updates.filter(({ movementId }) => {
        if (pendingBackfills.current.has(movementId)) {
          return false;
        }

        pendingBackfills.current.add(movementId);
        return true;
      });

      if (uniqueUpdates.length === 0) {
        return;
      }

      try {
        const results = [];

        for (let index = 0; index < uniqueUpdates.length; index += BACKFILL_BATCH_SIZE) {
          const chunk = uniqueUpdates.slice(index, index + BACKFILL_BATCH_SIZE);
          const result = await TransactionsApiHelper.updateMovementsBatch(
            selectedSpreadsheetId,
            chunk,
          );
          results.push(result);
        }

        const hasSuccessfulUpdate = results.some(Boolean);

        if (hasSuccessfulUpdate) {
          TransactionsMutationHelpers.invalidateMovementCaches(queryClient);
        }
      } finally {
        uniqueUpdates.forEach(({ movementId }) => {
          pendingBackfills.current.delete(movementId);
        });
      }
    },
    [queryClient, selectedSpreadsheetId],
  );

  const distinctLocations = useMemo(() => {
    const resolvedLocationMap = new Map<
      string,
      {
        display: string;
        resolvedMovements: Movement[];
        coordinates: { lat: number; lng: number };
      }
    >();
    const unresolvedLocationMap = new Map<
      string,
      {
        display: string;
        movementsWithoutCoordinates: Movement[];
      }
    >();

    for (const m of movements) {
      const parsedLocation = parseLocationValue(m.location);
      if (!parsedLocation.address) continue;

      if (parsedLocation.hasCoordinates) {
        const key = getLocationCoordinatesKey(parsedLocation);
        if (!key) {
          continue;
        }

        if (!resolvedLocationMap.has(key)) {
          resolvedLocationMap.set(key, {
            display: parsedLocation.address,
            resolvedMovements: [],
            coordinates: {
              lat: parsedLocation.latitude!,
              lng: parsedLocation.longitude!,
            },
          });
        }

        const entry = resolvedLocationMap.get(key)!;
        entry.display = parsedLocation.address;
        entry.resolvedMovements.push(m);
      } else {
        const key = parsedLocation.address.toLowerCase();

        if (!unresolvedLocationMap.has(key)) {
          unresolvedLocationMap.set(key, {
            display: parsedLocation.address,
            movementsWithoutCoordinates: [],
          });
        }

        unresolvedLocationMap.get(key)!.movementsWithoutCoordinates.push(m);
      }
    }

    return {
      resolved: Array.from(resolvedLocationMap.values()),
      unresolved: Array.from(unresolvedLocationMap.values()),
    };
  }, [movements]);

  // Initialize PlacesService once map API is loaded
  useEffect(() => {
    if (isLoaded && !placesServiceRef.current) {
      const div = document.createElement('div');
      placesServiceRef.current = new google.maps.places.PlacesService(div);
    }
  }, [isLoaded]);

  // Fit map bounds to all markers
  const fitBounds = useCallback((groups: LocationGroup[]) => {
    const map = mapRef.current;
    if (!map || groups.length === 0) return;

    if (groups.length === 1) {
      map.panTo({ lat: groups[0].lat, lng: groups[0].lng });
      map.setZoom(13);
    } else {
      const bounds = new google.maps.LatLngBounds();
      groups.forEach((g) => bounds.extend({ lat: g.lat, lng: g.lng }));
      map.fitBounds(bounds, 60);
    }
  }, []);

  // Geocode all distinct locations
  useEffect(() => {
    let isCancelled = false;

    const buildGroups = async () => {
      if (distinctLocations.resolved.length === 0 && distinctLocations.unresolved.length === 0) {
        setLocationGroups([]);
        return;
      }

      const groups: LocationGroup[] = [];
      const silentUpdates: Array<{ movementId: string; location: string }> = [];

      distinctLocations.resolved.forEach((entry) => {
        if (entry.resolvedMovements.length === 0) {
          return;
        }

        groups.push({
          location: entry.display,
          lat: entry.coordinates.lat,
          lng: entry.coordinates.lng,
          movements: entry.resolvedMovements,
        });
      });

      if (isLoaded && placesServiceRef.current) {
        const service = placesServiceRef.current;
        const unresolvedEntries = distinctLocations.unresolved.filter(
          (entry) => !geocodeCache.current.has(entry.display.toLowerCase()),
        );

        const geocodedGroups: Array<{
          group: LocationGroup | null;
          updates: Array<{ movementId: string; location: string }>;
        }> = [];

        for (let index = 0; index < unresolvedEntries.length; index += GEOCODE_BATCH_SIZE) {
          const chunk = unresolvedEntries.slice(index, index + GEOCODE_BATCH_SIZE);
          const chunkResults = await Promise.all(
            chunk.map((entry) => {
              return new Promise<{
                group: LocationGroup | null;
                updates: Array<{ movementId: string; location: string }>;
              }>((resolve) => {
                service.textSearch({ query: entry.display, region: 'it' }, (results, status) => {
                  if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
                    const lat = results[0].geometry?.location?.lat();
                    const lng = results[0].geometry?.location?.lng();

                    if (lat != null && lng != null) {
                      geocodeCache.current.set(entry.display.toLowerCase(), {
                        lat,
                        lng,
                      });

                      resolve({
                        group: null,
                        updates: entry.movementsWithoutCoordinates.map((movement) => ({
                          movementId: movement.id,
                          location: serializeLocationValue({
                            address: entry.display,
                            latitude: lat,
                            longitude: lng,
                          }),
                        })),
                      });
                      return;
                    }
                  }

                  resolve({ group: null, updates: [] });
                });
              });
            }),
          );
          geocodedGroups.push(...chunkResults);
        }

        if (isCancelled) {
          return;
        }

        geocodedGroups.forEach(({ group, updates }) => {
          silentUpdates.push(...updates);
        });
      }

      if (isCancelled) {
        return;
      }

      setLocationGroups(groups);
      fitBounds(groups);
      void backfillLocations(silentUpdates);
    };

    void buildGroups();

    return () => {
      isCancelled = true;
    };
  }, [backfillLocations, distinctLocations, fitBounds, isLoaded]);

  // Smooth pan + zoom to a marker
  const smoothPanTo = useCallback((lat: number, lng: number, targetZoom: number) => {
    const map = mapRef.current;
    if (!map) return;

    const currentZoom = map.getZoom() || 6;

    if (targetZoom - currentZoom > 4) {
      const midZoom = Math.max(currentZoom, Math.floor((currentZoom + targetZoom) / 2) - 1);
      map.setZoom(midZoom);
      map.panTo({ lat, lng });
      setTimeout(() => {
        map.setZoom(targetZoom);
      }, 400);
    } else {
      map.panTo({ lat, lng });
      if (currentZoom !== targetZoom) {
        setTimeout(() => {
          map.setZoom(targetZoom);
        }, 300);
      }
    }
  }, []);

  const handleMarkerClick = useCallback(
    (group: LocationGroup) => {
      setSelectedGroup(group);
      smoothPanTo(group.lat, group.lng, 14);
    },
    [smoothPanTo],
  );

  const handleMapClick = useCallback(() => {
    setSelectedGroup(null);
  }, []);

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (locationGroups.length > 0) {
        fitBounds(locationGroups);
      }
    },
    [locationGroups, fitBounds],
  );

  // Sort movements by date descending
  const sortedMovements = useMemo(() => {
    if (!selectedGroup) return [];
    return [...selectedGroup.movements].sort((a, b) => compareDates(b.date, a.date));
  }, [selectedGroup]);

  const markerIcon = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" fill="none">
        <path fill="${primaryColor}" d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0Z"/>
        <circle cx="14" cy="14" r="5.5" fill="white"/>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, [primaryColor]);

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: true,
      zoomControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      styles: colorScheme === 'dark' ? DARK_MAP_STYLES : undefined,
    }),
    [colorScheme],
  );

  if (!isLoaded) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={{ color: textColor, textAlign: 'center', marginTop: 40 }}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.commandBarContainer} pointerEvents="box-none">
        <View style={[styles.commandBar, { backgroundColor: cardBackground, borderColor }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to dashboard"
            title="Back to dashboard"
            onPress={onBack}
            style={styles.iconButton}
          >
            <MaterialIcons name="arrow-back" size={20} color={subtextColor} />
          </Pressable>
          <View style={styles.commandBarSpacer} />
          <View style={styles.brandSection}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.miniBarLogo}
              resizeMode="contain"
            />
            <Text style={[styles.miniBarText, { color: brandColor }]}>Map</Text>
          </View>
        </View>
      </View>

      {/* Full-screen map */}
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={initialCenter}
        zoom={initialZoom}
        onLoad={handleMapLoad}
        options={mapOptions}
        onClick={handleMapClick}
      >
        {locationGroups.map((group, idx) => (
          <MarkerF
            key={`${group.location}-${idx}`}
            position={{ lat: group.lat, lng: group.lng }}
            icon={markerIcon}
            opacity={hoveredLocation === group.location ? 0.78 : 1}
            onMouseOver={() => setHoveredLocation(group.location)}
            onMouseOut={() => setHoveredLocation(null)}
            title={`${group.location} (${group.movements.length})`}
            onClick={() => handleMarkerClick(group)}
          />
        ))}
      </GoogleMap>

      {/* Bottom-left panel — movements card style */}
      {selectedGroup && (
        <View
          style={[
            styles.panel,
            { backgroundColor: cardBackground, borderColor, width: Math.min(400, width - 32) },
            compact && styles.panelCompact,
          ]}
        >
          {/* Location header */}
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderText}>
              <Text style={[styles.panelTitle, { color: textColor }]} numberOfLines={2}>
                {selectedGroup.location}
              </Text>
              <Text style={[styles.panelSubtitle, { color: subtextColor }]}>
                {selectedGroup.movements.length} moviment
                {selectedGroup.movements.length === 1 ? 'o' : 'i'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close location details"
              title="Close location details"
              onPress={() => setSelectedGroup(null)}
              style={styles.iconButton}
            >
              <MaterialIcons name="close" size={18} color={subtextColor} />
            </Pressable>
          </View>

          <View style={[styles.panelDivider, { backgroundColor: borderColor }]} />

          {/* Movements list — same style as RecentMovementsCard */}
          <ScrollView
            style={styles.panelList}
            contentContainerStyle={styles.panelListContent}
            showsVerticalScrollIndicator={true}
          >
            {sortedMovements.map((movement) => {
              const icon = MovementHelper.getMovementIcon(movement.category, categories);
              const color = MovementHelper.getMovementColor(
                movement.type,
                movement.category,
                categories,
              );
              const amount = movement.totalAmount;

              return (
                <View key={movement.id} style={styles.movementItem}>
                  <View style={[styles.movementIcon, { backgroundColor: color }]}>
                    <IconSymbol name={icon} size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.movementInfo}>
                    <Text style={[styles.movementDate, { color: subtextColor }]}>
                      {formatDateForDisplay(movement.date, 'it-IT')}
                    </Text>
                    <Text
                      style={[styles.movementDescription, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {movement.description}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.movementAmount,
                      amount > 0 ? { color: positiveAmountColor } : { color: textColor },
                    ]}
                  >
                    {amount > 0 ? '+' : ''}
                    {amount.toFixed(2).replace('.', ',')}€
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Info badge — bottom right */}
      {locationGroups.length > 0 && (
        <View
          style={[
            styles.infoBadge,
            { backgroundColor: cardBackground, borderColor },
            compact && styles.infoBadgeCompact,
          ]}
        >
          <MaterialIcons name="place" size={16} color={brandColor} />
          <Text style={[styles.infoBadgeText, { color: textColor }]}>
            {locationGroups.length} posizion
            {locationGroups.length === 1 ? 'e' : 'i'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  commandBarContainer: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 58,
    padding: 8,
    borderWidth: 1,
    borderRadius: 20,
    boxShadow: '0 1px 2px rgba(17, 31, 24, 0.03), 0 8px 24px rgba(17, 31, 24, 0.05)',
    backdropFilter: 'blur(20px)',
  },
  commandBarSpacer: { flex: 1 },
  brandSection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
  miniBarLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  miniBarText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
  },
  // Panel — bottom left
  panel: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    maxHeight: '65%',
    borderWidth: 1,
    borderRadius: 20,
    boxShadow: '0 1px 2px rgba(17, 31, 24, 0.03), 0 10px 28px rgba(17, 31, 24, 0.05)',
    overflow: 'hidden',
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  panelCompact: { maxHeight: '50%' },
  panelHeaderText: { flex: 1, minWidth: 0 },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
    paddingBottom: 12,
    gap: 12,
  },
  panelTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0,
    overflowWrap: 'anywhere',
    textTransform: 'capitalize',
  },
  panelSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  panelDivider: {
    height: 1,
    marginHorizontal: 2,
    marginBottom: 8,
  },
  panelList: {
    minHeight: 0,
    flexShrink: 1,
    marginRight: -10,
  },
  panelListContent: { gap: 6, paddingRight: 10 },
  // Movement rows — matching RecentMovementsCard style
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  movementIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  movementInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  movementDate: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 0,
  },
  movementDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  movementAmount: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  // Info badge — bottom right
  infoBadge: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 14,
    boxShadow: '0 1px 2px rgba(17, 31, 24, 0.03), 0 8px 24px rgba(17, 31, 24, 0.05)',
  },
  infoBadgeCompact: { top: 88, bottom: 'auto' },
  infoBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
