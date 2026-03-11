import { ThemedText } from "../core/themed-text.native";
import { View, StyleSheet, Animated, TextInput } from "react-native";
import { useThemeColor } from "@/src/hooks/use-theme-color";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { GoogleMap, MarkerF, useLoadScript } from "@react-google-maps/api";

const LIBRARIES: "places"[] = ["places"];

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
}

const DEFAULT_CENTER = { lat: 39.2238, lng: 9.1217 };

const LocationPicker: React.FC<ILocationPickerProps> = ({
  value,
  onChange,
  label = "Location",
  placeholder = "Enter location...",
  googleMapsApiKey,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);

  const cardHeight = useRef(new Animated.Value(30)).current;
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const placeholderColor = useThemeColor(
    { light: "#aaa", dark: "#666" },
    "tabIconDefault",
  );

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey || "",
    libraries: LIBRARIES,
    language: "it",
    region: "IT",
  });

  useEffect(() => {
    if (isLoaded && !placesServiceRef.current) {
      const div = document.createElement("div");
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

  const searchAndShow = useCallback(
    (query: string) => {
      if (!placesServiceRef.current) return;

      placesServiceRef.current.textSearch(
        { query, region: "it" },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
            const first = results[0];
            const lat = first.geometry?.location?.lat();
            const lng = first.geometry?.location?.lng();
            if (lat != null && lng != null) {
              setMapCenter({ lat, lng });
              setMarkerPos({ lat, lng });
              expandCard();
              onChange({
                address: query,
                latitude: lat,
                longitude: lng,
                placeId: first.place_id,
              });
            }
          }
        },
      );
    },
    [expandCard, onChange],
  );

  const handleTextChange = (text: string) => {
    onChange({ address: text });

    if (!text.trim()) {
      collapseCard();
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.length >= 3) {
      searchTimeout.current = setTimeout(() => searchAndShow(text), 600);
    }
  };

  if (!isLoaded) {
    return (
      <View style={styles.cardContent}>
        <View style={styles.inputRow}>
          <ThemedText type="default" style={styles.label}>{label}</ThemedText>
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
        <ThemedText type="default" style={styles.label}>{label}</ThemedText>
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
            mapContainerStyle={{ width: "100%", height: "100%" }}
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
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  inputRow: {
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingVertical: 15,
    alignItems: "center",
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
    display: "flex",
    flex: 1,
    textAlign: "right",
    fontSize: 18,
    paddingHorizontal: 10,
    minWidth: 0,
    outlineColor: "transparent",
  },
  mapContainer: {
    flex: 1,
    marginTop: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
});

export default LocationPicker;
