import { ThemedText } from "../core/themed-text";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
  Pressable,
} from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useState, useRef, useEffect } from "react";
import TextBox from "./text-box";

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

/**
 * Web version of LocationPicker.
 * Uses text input with autocomplete instead of native maps.
 */
const LocationPicker: React.FC<ILocationPickerProps> = ({
  value,
  onChange,
  label = "Location",
  placeholder = "Enter location...",
  googleMapsApiKey,
}) => {
  const [searchResults, setSearchResults] = useState<ILocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const cardHeight = useRef(new Animated.Value(40)).current;

  const backgroundColor = useThemeColor(
    { light: "#f5f5f5", dark: "#1a1a1a" },
    "background"
  );
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault"
  );

  const handleTextChange = async (text: string) => {
    onChange({ address: text });
    if (!text.trim()) {
      setSearchResults([]);
      collapseCard();
      return;
    }

    if (text.length < 3) return;

    expandCard();
    setIsLoading(true);

    try {
      if (googleMapsApiKey) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            text
          )}&key=${googleMapsApiKey}&region=it&language=it`
        );

        const data = await response.json();

        if (data.status === "OK") {
          const locations: ILocation[] = data.results
            .slice(0, 5)
            .map((place: any) => ({
              address: place.formatted_address,
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
              placeId: place.place_id,
            }));

          setSearchResults(locations);
        } else {
          setSearchResults([]);
        }
      } else {
        // Mock search results for demo without API key
        const mockResults: ILocation[] = [
          {
            address: `${text}, Sestu, CA, Italy`,
            latitude: 39.2238,
            longitude: 8.8203,
          },
          {
            address: `${text}, Cagliari, CA, Italy`,
            latitude: 39.2238,
            longitude: 9.1217,
          },
        ];
        setSearchResults(mockResults);
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
        toValue: 250,
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
    onChange(location);
    setSearchResults([]);
    collapseCard();
  };

  return (
    <Animated.View style={[styles.cardContent, { height: cardHeight }]}>
      <TextBox label="Location" value={value} onChange={handleTextChange} />

      {isExpanded && (
        <View style={styles.expandedContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={textColor} />
            </View>
          ) : (
            <ScrollView style={styles.resultsContainer}>
              {searchResults.map((location, index) => (
                <Pressable
                  key={index}
                  style={[styles.resultItem, { borderColor }]}
                  onPress={() => handleLocationSelect(location)}
                >
                  <ThemedText style={styles.resultText}>
                    {location.address}
                  </ThemedText>
                  {location.latitude && location.longitude && (
                    <ThemedText style={styles.coordsText}>
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </ThemedText>
                  )}
                </Pressable>
              ))}
              {searchResults.length === 0 && !isLoading && (
                <ThemedText style={styles.noResultsText}>
                  No locations found
                </ThemedText>
              )}
            </ScrollView>
          )}
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
  expandedContent: {
    flex: 1,
    paddingTop: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 8,
    cursor: "pointer",
  },
  resultText: {
    fontSize: 14,
  },
  coordsText: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 4,
    fontFamily: "monospace",
  },
  noResultsText: {
    textAlign: "center",
    padding: 20,
    opacity: 0.6,
  },
});

export default LocationPicker;
