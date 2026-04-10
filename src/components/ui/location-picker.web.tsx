import { ThemedText } from '../core/themed-text.native';
import { View, StyleSheet, Animated, TextInput } from 'react-native';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { capitalizeLocationQuery, isLocationResolved } from '@/src/utils/locationValue';

const LIBRARIES: 'places'[] = ['places'];

export interface ILocation {
  address: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

interface ILocationPickerProps {
  value: string;
  location?: ILocation | null;
  onChange: (location: ILocation) => void;
  label?: string;
  placeholder?: string;
  googleMapsApiKey?: string;
}

const DEFAULT_CENTER = { lat: 39.2238, lng: 9.1217 };

const LocationPicker: React.FC<ILocationPickerProps> = ({
  value,
  location,
  onChange,
  label = 'Location',
  placeholder = 'Enter location...',
  googleMapsApiKey,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [markerPos, setMarkerPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const cardHeight = useRef(new Animated.Value(30)).current;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const hasUserEditedQuery = useRef(false);

  const textColor = useThemeColor({ light: '#000', dark: '#fff' }, 'text');
  const placeholderColor = useThemeColor({ light: '#aaa', dark: '#666' }, 'tabIconDefault');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey || '',
    libraries: LIBRARIES,
    language: 'it',
    region: 'IT',
  });

  useEffect(() => {
    if (isLoaded && !placesServiceRef.current) {
      const div = document.createElement('div');
      placesServiceRef.current = new google.maps.places.PlacesService(div);
    }
  }, [isLoaded]);

  const expandCard = useCallback(() => {
    if (!isExpanded) {
      setIsExpanded(true);
      Animated.timing(cardHeight, {
        toValue: 200,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isExpanded, cardHeight]);

  const collapseCard = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
      setMarkerPos(null);
      Animated.timing(cardHeight, {
        toValue: 30,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isExpanded, cardHeight]);

  const showResolvedLocation = useCallback(
    (nextLocation: ILocation) => {
      if (!isLocationResolved(nextLocation)) {
        return;
      }

      setMapCenter({
        lat: nextLocation.latitude!,
        lng: nextLocation.longitude!,
      });
      setMarkerPos({
        lat: nextLocation.latitude!,
        lng: nextLocation.longitude!,
      });
      expandCard();
    },
    [expandCard],
  );

  const searchAndShow = useCallback(
    (query: string) => {
      if (!placesServiceRef.current) return;

      placesServiceRef.current.textSearch({ query, region: 'it' }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
          const first = results[0];
          const lat = first.geometry?.location?.lat();
          const lng = first.geometry?.location?.lng();
          if (lat != null && lng != null) {
            const resolvedLocation = {
              address: capitalizeLocationQuery(query),
              latitude: lat,
              longitude: lng,
              placeId: first.place_id,
            };

            showResolvedLocation(resolvedLocation);
            onChange(resolvedLocation);
          }
        }
      });
    },
    [onChange, showResolvedLocation],
  );

  // Auto-expand map when mounting with a pre-existing location value (e.g. editing a movement)
  const initialSearchDone = useRef(false);
  useEffect(() => {
    if (location && isLocationResolved(location)) {
      showResolvedLocation(location);
      initialSearchDone.current = true;
      return;
    }

    if (!value.trim()) {
      collapseCard();
      initialSearchDone.current = false;
    }
  }, [collapseCard, location, showResolvedLocation, value]);

  // Initial auto-search when value is pre-populated (edit mode) and user hasn't typed yet
  useEffect(() => {
    if (
      hasUserEditedQuery.current ||
      initialSearchDone.current ||
      !value ||
      value.trim().length < 3 ||
      isLocationResolved(location)
    ) {
      return;
    }

    initialSearchDone.current = true;
    if (isLoaded && placesServiceRef.current) {
      searchAndShow(value.trim());
    }
  }, [isLoaded, location, searchAndShow, value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search triggered by user edits
  useEffect(() => {
    if (!hasUserEditedQuery.current || isLocationResolved(location)) {
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      collapseCard();
      return;
    }

    if (trimmedValue.length < 3) return;

    debounceTimer.current = setTimeout(() => {
      if (isLoaded && placesServiceRef.current) {
        searchAndShow(trimmedValue);
      }
    }, 600);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [collapseCard, isLoaded, location, searchAndShow, value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTextChange = (text: string) => {
    hasUserEditedQuery.current = true;
    onChange({ address: text });

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      setMarkerPos(null);
      collapseCard();
    }
  };

  if (!isLoaded) {
    return (
      <View style={styles.cardContent}>
        <View style={styles.inputRow}>
          <ThemedText type="default" style={styles.label}>
            {label}
          </ThemedText>
          <TextInput
            style={[styles.textInput, { color: textColor }]}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            editable={false}
          />
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.cardContent, { height: cardHeight }]}>
      <View style={styles.inputRow}>
        <ThemedText type="default" style={styles.label}>
          {label}
        </ThemedText>
        <TextInput
          style={[styles.textInput, { color: textColor }]}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
        />
      </View>

      {isExpanded && markerPos && (
        <View style={styles.mapContainer}>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={15}
            options={{ disableDefaultUI: true, zoomControl: true }}
          >
            <MarkerF position={markerPos} />
          </GoogleMap>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  inputRow: {
    display: 'flex',
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingVertical: 15,
    alignItems: 'center',
    flex: 0,
  },
  label: {
    flex: 0,
    flexShrink: 0,
    marginRight: 12,
    minWidth: 120,
    maxWidth: 200,
  },
  textInput: {
    display: 'flex',
    flex: 1,
    textAlign: 'right',
    fontSize: 18,
    paddingHorizontal: 10,
    minWidth: 0,
  },
  mapContainer: {
    flex: 1,
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
});

export default LocationPicker;
