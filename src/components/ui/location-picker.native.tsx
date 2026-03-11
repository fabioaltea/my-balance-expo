import { ThemedText } from "../core/themed-text.native";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import React, { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
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
  onChange: (location: ILocation) => void;
  label?: string;
  placeholder?: string;
  googleMapsApiKey?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const LocationPicker: React.FC<ILocationPickerProps> = ({
  value,
  onChange,
  label = "Location",
  placeholder = "Enter location...",
  googleMapsApiKey,
  onFocus,
  onBlur,
}) => {
  const [searchResults, setSearchResults] = useState<ILocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<ILocation | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const cameraRef = useRef<Mapbox.Camera>(null);

  const sdkInitialized = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    setSelectedLocation(searchResults[0] || null);
  }, [searchResults]);

  // If value is already set (edit mode), expand and search on first non-empty value
  const initialSearchDone = useRef(false);
  useEffect(() => {
    if (!initialSearchDone.current && value && value.trim().length >= 3) {
      initialSearchDone.current = true;
      searchPlaces(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardHeight = useRef(new Animated.Value(40)).current;

  const placeholderColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "tabIconDefault",
  );

  const searchPlaces = async (text: string) => {
    expandCard();
    setIsLoading(true);

    try {
      if (googleMapsApiKey) {
        const predictions = await GooglePlacesSDK.fetchPredictions(text, {
          countries: ["it"],
        });

        const locations: ILocation[] = await Promise.all(
          predictions.slice(0, 5).map(async (prediction) => {
            const place = await GooglePlacesSDK.fetchPlaceByID(
              prediction.placeID,
              ["coordinate", "formattedAddress"],
            );
            return {
              address: place.formattedAddress || prediction.description,
              latitude: place.coordinate?.latitude,
              longitude: place.coordinate?.longitude,
              placeId: prediction.placeID,
            };
          }),
        );

        setSearchResults(locations);

        // Center map on first result
        if (
          locations.length > 0 &&
          locations[0].latitude &&
          locations[0].longitude
        ) {
          cameraRef.current?.setCamera({
            centerCoordinate: [locations[0].longitude, locations[0].latitude],
            zoomLevel: 15,
            animationDuration: 300,
          });
        }
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching places:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    onChange({ address: text });

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      setSearchResults([]);
      setSelectedLocation(null);
      collapseCard();
      return;
    }

    if (text.length < 3) return;

    debounceTimer.current = setTimeout(() => {
      searchPlaces(text);
    }, 2000);
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

  const handleLocationSelect = (location: ILocation) => {
    setSelectedLocation(location);
    onChange(location);
    setSearchResults([]);

    if (location.latitude && location.longitude) {
      cameraRef.current?.setCamera({
        centerCoordinate: [location.longitude, location.latitude],
        zoomLevel: 17,
        animationDuration: 300,
      });
    }

    collapseCard();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Animated.View style={[styles.cardContent]}>
      <TextBox
        label="Location"
        value={value}
        onChange={handleTextChange}
        onFocus={onFocus}
        onBlur={onBlur}
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
              {selectedLocation?.latitude && selectedLocation?.longitude && (
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
