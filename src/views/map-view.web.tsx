import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { useQueryClient } from '@tanstack/react-query';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { useThemeColor } from '@/src/hooks/use-theme-color';
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
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({ light: '#888', dark: '#999' }, 'tabIconDefault');
  const borderColor = useThemeColor({ light: '#F0F0F0', dark: '#333333' }, 'tabIconDefault');
  const positiveAmountColor = useThemeColor({ light: '#107c2bff', dark: '#34C759' }, 'tint');
  const primaryColor = '#2F4F3F';
  const miniBarBg = useThemeColor(
    { light: 'rgba(255, 255, 255, 0.75)', dark: 'rgba(40, 40, 40, 0.8)' },
    'cardBackground',
  );
  const miniBarTextColor = useThemeColor({ light: '#2F4F3F', dark: '#FFFFFF' }, 'text');

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
      {/* Back button - top left */}
      <Pressable style={styles.backButton} onPress={onBack}>
        <View style={styles.backButtonInner}>
          <MaterialIcons name="arrow-back" size={20} color="#fff" />
        </View>
      </Pressable>

      {/* Mini command bar - static centered title */}
      <View style={styles.miniBarContainer}>
        <View style={[styles.miniBar, { backgroundColor: miniBarBg }]}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.miniBarLogo}
            resizeMode="contain"
          />
          <Text style={[styles.miniBarText, { color: miniBarTextColor }]}>MyBalance</Text>
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
            title={`${group.location} (${group.movements.length})`}
            onClick={() => handleMarkerClick(group)}
          />
        ))}
      </GoogleMap>

      {/* Bottom-left panel — movements card style */}
      {selectedGroup && (
        <View style={[styles.panel, { backgroundColor: cardBackground }]}>
          {/* Location header */}
          <View style={styles.panelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.panelTitle, { color: textColor }]} numberOfLines={2}>
                {selectedGroup.location}
              </Text>
              <Text style={[styles.panelSubtitle, { color: subtextColor }]}>
                {selectedGroup.movements.length} moviment
                {selectedGroup.movements.length === 1 ? 'o' : 'i'}
              </Text>
            </View>
            <Pressable onPress={() => setSelectedGroup(null)} style={styles.closeButton}>
              <MaterialIcons name="close" size={18} color={subtextColor} />
            </Pressable>
          </View>

          <View style={[styles.panelDivider, { backgroundColor: borderColor }]} />

          {/* Movements list — same style as RecentMovementsCard */}
          <ScrollView style={styles.panelList} showsVerticalScrollIndicator={true}>
            {sortedMovements.map((movement, index) => {
              const icon = MovementHelper.getMovementIcon(movement.category, categories);
              const color = MovementHelper.getMovementColor(
                movement.type,
                movement.category,
                categories,
              );
              const amount = movement.totalAmount;

              return (
                <View
                  key={movement.id}
                  style={[
                    styles.movementItem,
                    { borderBottomColor: borderColor },
                    index === sortedMovements.length - 1 && styles.lastMovementItem,
                  ]}
                >
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
        <View style={[styles.infoBadge, { backgroundColor: cardBackground }]}>
          <MaterialIcons name="place" size={16} color="#2F4F3F" />
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
  // Back button
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Mini command bar — static centered title
  miniBarContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  miniBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
    backdropFilter: 'blur(20px)',
  },
  miniBarLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  miniBarText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  // Panel — bottom left
  panel: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 380,
    maxHeight: '70%',
    borderRadius: 30,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingBottom: 12,
    gap: 12,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    textTransform: 'capitalize',
  },
  panelSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  panelDivider: {
    height: 1,
    marginHorizontal: 10,
    marginBottom: 4,
  },
  panelList: {
    paddingHorizontal: 0,
    paddingRight: 10,
  },
  // Movement rows — matching RecentMovementsCard style
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lastMovementItem: {
    borderBottomWidth: 0,
  },
  movementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  movementInfo: {
    flex: 1,
  },
  movementDate: {
    fontSize: 12,
    marginBottom: 0,
  },
  movementDescription: {
    fontSize: 15,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  movementAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Info badge — bottom right
  infoBadge: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
  infoBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
