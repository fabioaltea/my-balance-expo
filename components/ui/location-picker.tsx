import { ThemedText } from "../themed-text";
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
import { useThemeColor } from "@/hooks/use-theme-color";
import React, { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import TextBox from "./text-box";
import MapView, { Marker } from "react-native-maps";


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
}

const LocationPicker: React.FC<ILocationPickerProps> = ({
  value,
  onChange,
  label = "Location",
  placeholder = "Enter location...",
  googleMapsApiKey,
}) => {
  const [searchResults, setSearchResults] = useState<ILocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<ILocation | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 39.2238,
    longitude: 9.1217,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    setSelectedLocation(searchResults[0] || null);
  }, [searchResults]);


  const cardHeight = useRef(new Animated.Value(40)).current; // Initial collapsed height

  // Theme colors
  const backgroundColor = useThemeColor(
    { light: "#f5f5f5", dark: "#1a1a1a" },
    "background"
  );
  const textColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const borderColor = useThemeColor(
    { light: "#e0e0e0", dark: "#333" },
    "tabIconDefault"
  );
  const placeholderColor = useThemeColor(
    { light: "#666", dark: "#999" },
    "tabIconDefault"
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
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            text
          )}&key=${googleMapsApiKey}&region=it&language=it`
        );

        const data = await response.json();

        console.log("Places API response:", data);

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
          
          // Center map on first result
          if (locations.length > 0 && locations[0].latitude && locations[0].longitude) {
            setMapRegion({
              latitude: locations[0].latitude,
              longitude: locations[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
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
        
        // Center map on first result
        if (mockResults.length > 0) {
          setMapRegion({
            latitude: mockResults[0].latitude!,
            longitude: mockResults[0].longitude!,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
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
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
    
    collapseCard();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Animated.View
      style={[
        styles.cardContent,
        {  height: cardHeight },
      ]}
    >

        <TextBox label="Location" value={value} onChange={handleTextChange}>
            
        </TextBox>
        
          {/* {isLoading && (
            <ActivityIndicator
              size="small"
              color={placeholderColor}
              style={styles.loadingIcon}
            />
          )} */}
 

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Map Placeholder */}
          <View style={[styles.mapContainer, { backgroundColor: "#f0f0f0" }]}>
            <MapView 
              style={{width:"100%", height: "100%"}} 
              provider="google" 
              region={mapRegion}
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
    flexDirection:"column",
    justifyContent: "flex-start"
  },
  loadingIcon: {
    marginLeft: 8,
  },
  expandedContent: {
    flex: 0,
    paddingBottom:5
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

// const styles = StyleSheet.create({
//   label: {
//     fontSize: 16,
//     fontWeight: "600",
//     marginBottom: 8,
//   },
//   container: {
//     borderWidth: 1,
//     borderRadius: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//   },
//   content: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   icon: {
//     marginRight: 12,
//   },
//   valueText: {
//     fontSize: 16,
//     flex: 1,
//   },
//   chevron: {
//     marginLeft: 8,
//   },
//   modalContent: {
//     flex: 1,
//     padding: 16,
//   },
//   searchContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     marginBottom: 16,
//   },
//   searchIcon: {
//     marginRight: 8,
//   },
//   searchInput: {
//     flex: 1,
//     fontSize: 16,
//     paddingVertical: 4,
//   },
//   mapContainer: {
//     height: 200,
//     borderRadius: 8,
//     marginBottom: 16,
//     overflow: "hidden",
//   },
//   mapPlaceholder: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 20,
//   },
//   mapText: {
//     fontSize: 18,
//     fontWeight: "600",
//     marginTop: 8,
//     color: "#666",
//   },
//   mapSubtext: {
//     fontSize: 14,
//     color: "#888",
//     textAlign: "center",
//     marginTop: 4,
//   },
//   coordsText: {
//     fontSize: 12,
//     color: "#666",
//     textAlign: "center",
//     marginTop: 8,
//     fontFamily: "monospace",
//   },
//   resultsContainer: {
//     maxHeight: 300,
//   },
//   resultsHeader: {
//     fontSize: 16,
//     fontWeight: "600",
//     marginBottom: 12,
//   },
//   resultItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 12,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderRadius: 8,
//   },
//   resultContent: {
//     flex: 1,
//     marginLeft: 12,
//     marginRight: 8,
//   },
//   resultAddress: {
//     fontSize: 14,
//     lineHeight: 18,
//   },
//   warningContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 16,
//     backgroundColor: "#fff3cd",
//     borderRadius: 8,
//     marginTop: 16,
//   },
//   warningText: {
//     fontSize: 14,
//     color: "#856404",
//     marginLeft: 12,
//     flex: 1,
//   },
// });

// export default LocationPicker;
