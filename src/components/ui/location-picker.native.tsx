import { ThemedText } from "../core/themed-text.native";
import { View, StyleSheet, ActivityIndicator, Animated } from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import React, { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import {
  capitalizeLocationQuery,
  isLocationResolved,
} from "@/src/utils/locationValue";
import TextBox from "./text-box.native";
import Mapbox from "@rnmapbox/maps";
import GooglePlacesSDK from "react-native-google-places-sdk";

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN || "");

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
  onFocus?: () => void;
  onBlur?: () => void;
}

const LocationPicker: React.FC<ILocationPickerProps> = ({
  value,
  location,
  onChange,
  label = "Location",
  placeholder = "Enter location...",
  googleMapsApiKey,
  onFocus,
  onBlur,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<ILocation | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const cameraRef = useRef<Mapbox.Camera>(null);

  const sdkInitialized = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUserEditedQuery = useRef(false);

  useEffect(() => {
    if (googleMapsApiKey && !sdkInitialized.current) {
      GooglePlacesSDK.initialize(googleMapsApiKey);
      sdkInitialized.current = true;
    }
  }, [googleMapsApiKey]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // If value is already set (edit mode), expand and search on first non-empty value
  const initialSearchDone = useRef(false);

  const centerMapOnLocation = (nextLocation: ILocation, zoomLevel = 15) => {
    if (!isLocationResolved(nextLocation)) {
      return;
    }

    cameraRef.current?.setCamera({
      centerCoordinate: [nextLocation.longitude!, nextLocation.latitude!],
      zoomLevel,
      animationDuration: 300,
    });
  };

  useEffect(() => {
    if (location && isLocationResolved(location)) {
      setSelectedLocation(location);
      expandCard();
      centerMapOnLocation(location);
      initialSearchDone.current = true;
      return;
    }

    if (!value.trim()) {
      setSelectedLocation(null);
      collapseCard();
      initialSearchDone.current = false;
    }
  }, [location, value]);

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
    searchPlaces(value);
  }, [location, value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasUserEditedQuery.current || isLocationResolved(location)) {
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      setIsLoading(false);
      collapseCard();
      return;
    }

    if (trimmedValue.length < 3) {
      setIsLoading(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      searchPlaces(trimmedValue);
    }, 1000);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [location, value]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardHeight = useRef(new Animated.Value(40)).current;

  const placeholderColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "tabIconDefault",
  );

  const searchPlaces = async (text: string) => {
    const normalizedQuery = capitalizeLocationQuery(text);

    expandCard();
    setIsLoading(true);

    try {
      if (googleMapsApiKey) {
        const predictions = await GooglePlacesSDK.fetchPredictions(text, {
          countries: ["it"],
        });

        const prediction = predictions[0];

        if (prediction) {
          const place = await GooglePlacesSDK.fetchPlaceByID(
            prediction.placeID,
            ["coordinate"],
          );
          const resolvedLocation: ILocation = {
            address: normalizedQuery,
            latitude: place.coordinate?.latitude,
            longitude: place.coordinate?.longitude,
            placeId: prediction.placeID,
          };

          setSelectedLocation(resolvedLocation);
          onChange(resolvedLocation);
          centerMapOnLocation(resolvedLocation);
        } else {
          setSelectedLocation(null);
          onChange({ address: normalizedQuery });
        }
      } else {
        setSelectedLocation(null);
      }
    } catch (error) {
      console.error("Error searching places:", error);
      setSelectedLocation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    hasUserEditedQuery.current = true;
    onChange({ address: text });

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      setSelectedLocation(null);
      setIsLoading(false);
      collapseCard();
      return;
    }

    setSelectedLocation(null);

    if (text.trim().length < 3) {
      setIsLoading(false);
    }
  };

  const expandCard = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      Animated.timing(cardHeight, {
        toValue: 200,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const collapseCard = () => {
    if (isExpanded) {
      setIsExpanded(false);
      Animated.timing(cardHeight, {
        toValue: 40,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  return (
    <Animated.View style={[styles.cardContent]}>
      <TextBox
        label={label}
        value={value}
        onChange={handleTextChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
      />

      {isLoading && (
        <ActivityIndicator
          size="small"
          color={placeholderColor}
          style={styles.loadingIcon}
        />
      )}

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={[styles.mapContainer, { backgroundColor: "#f0f0f0" }]}>
            <Mapbox.MapView
              style={{ flex: 1 }}
              scrollEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              zoomEnabled={false}
              attributionEnabled={false}
              logoEnabled={false}
              compassEnabled={false}
              scaleBarEnabled={false}
            >
              <Mapbox.Camera
                ref={cameraRef}
                zoomLevel={12}
                centerCoordinate={[9.1217, 39.2238]}
              />
              {selectedLocation?.latitude != null &&
                selectedLocation?.longitude != null && (
                  <Mapbox.PointAnnotation
                    id="selected-location"
                    coordinate={[
                      selectedLocation.longitude,
                      selectedLocation.latitude,
                    ]}
                    title={selectedLocation.address}
                  >
                    <View style={styles.marker} />
                  </Mapbox.PointAnnotation>
                )}
            </Mapbox.MapView>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContent: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  loadingIcon: {
    marginLeft: 8,
  },
  expandedContent: {
    flex: 0,
    paddingBottom: 5,
  },
  mapContainer: {
    height: 150,
    borderRadius: 20,
    marginBottom: 0,
    overflow: "hidden",
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF0000",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  resultsContainer: {
    flex: 1,
    maxHeight: 180,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});

export default LocationPicker;
