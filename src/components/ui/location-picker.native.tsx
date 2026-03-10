import { ThemedText } from "../core/themed-text.native";
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Animated,
  Pressable,
} from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import React, { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import TextBox from "./text-box.native";
import MapView, { Marker } from "react-native-maps";
import GooglePlacesSDK from "react-native-google-places-sdk";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const mapRef = useRef<MapView>(null);

  const defaultRegion = {
    latitude: 39.2238,
    longitude: 9.1217,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const sdkInitialized = useRef(false);

  useEffect(() => {
    if (googleMapsApiKey && !sdkInitialized.current) {
      GooglePlacesSDK.initialize(googleMapsApiKey);
      sdkInitialized.current = true;
    }
  }, [googleMapsApiKey]);

  useEffect(() => {
    setSelectedLocation(searchResults[0] || null);
  }, [searchResults]);

  const cardHeight = useRef(new Animated.Value(40)).current; // Initial collapsed height

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "#f5f5f5", dark: "#1a1a1a" },
    "background",
  );
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault",
  );
  const placeholderColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "tabIconDefault",
  );

  const handleTextChange = async (text: string) => {
    onChange({ address: text });
    if (!text.trim()) {
      setSearchResults([]);
      setSelectedLocation(null);
      collapseCard();
      return;
    }

    if (text.length < 3) return;

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
          mapRef.current?.animateToRegion(
            {
              latitude: locations[0].latitude,
              longitude: locations[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            300,
          );
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

  const expandCard = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      Animated.timing(cardHeight, {
        toValue: 200, // Expanded height
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const collapseCard = () => {
    if (isExpanded) {
      setIsExpanded(false);
      Animated.timing(cardHeight, {
        toValue: 40, // Collapsed height
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleLocationSelect = (location: ILocation) => {
    setSelectedLocation(location);
    onChange(location);
    setSearchResults([]);

    // Center map on selected location
    if (location.latitude && location.longitude) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        300,
      );
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

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Map Placeholder */}
          <View style={[styles.mapContainer, { backgroundColor: "#f0f0f0" }]}>
            <MapView
              ref={mapRef}
              style={{ width: "100%", height: "100%" }}
              provider="google"
              initialRegion={defaultRegion}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              {selectedLocation?.latitude && selectedLocation?.longitude && (
                <Marker
                  coordinate={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  title={selectedLocation.address}
                  description="Selected location"
                />
              )}
            </MapView>
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
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 4,
  },
  mapSubtext: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 2,
  },
  coordsText: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
    fontFamily: "monospace",
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
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff3cd",
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    color: "#856404",
    marginLeft: 8,
    flex: 1,
  },
});

export default LocationPicker;
