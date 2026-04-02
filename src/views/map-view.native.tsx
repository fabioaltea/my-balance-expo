import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Mapbox from '@/src/lib/mapbox';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/src/components/core/themed-text.native';
import ModalPanel from '@/src/components/ui/modal-panel';
import IconSymbol from '@/src/components/ui/icon-symbol';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import { useDataContext } from '@/src/state';
import type { Movement } from '@/src/types/models';
import { MovementHelper } from '@/src/helpers/MovementHelper';
import { compareDates, formatDateForDisplay } from '@/src/utils/dateUtils';
import { getLocationCoordinatesKey, parseLocationValue } from '@/src/utils/locationValue';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN || '');

const DEFAULT_CENTER: [number, number] = [9.1217, 39.2238];
const EXPANDED_SHEET_HEIGHT = Dimensions.get('window').height * 0.8;

interface LocationGroup {
  key: string;
  location: string;
  latitude: number;
  longitude: number;
  movements: Movement[];
}

type SheetStep = 'preview' | 'details';

export default function MapViewNative() {
  const { movements, categories } = useDataContext();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [selectedGroup, setSelectedGroup] = useState<LocationGroup | null>(null);
  const [sheetStep, setSheetStep] = useState<SheetStep>('preview');
  const colorScheme = useColorScheme() ?? 'light';

  const textColor = useThemeColor({}, 'text');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const backgroundColor = useThemeColor({}, 'background');
  const subtextColor = useThemeColor({ light: '#888', dark: '#999' }, 'tabIconDefault');
  const borderColor = useThemeColor({ light: '#F0F0F0', dark: '#333333' }, 'tabIconDefault');
  const positiveAmountColor = useThemeColor({ light: '#107c2bff', dark: '#34C759' }, 'tint');
  const primaryColor = '#2F4F3F';
  const markerBorderColor = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : '#2F4F3F';
  const mapStyleURL = colorScheme === 'dark' ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Light;

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const locationGroups = useMemo(() => {
    const groups = new Map<string, LocationGroup>();

    for (const movement of movements) {
      const parsedLocation = parseLocationValue(movement.location);
      if (!parsedLocation.hasCoordinates) {
        continue;
      }

      const key = getLocationCoordinatesKey(parsedLocation);
      if (!key) {
        continue;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          location: parsedLocation.address,
          latitude: parsedLocation.latitude!,
          longitude: parsedLocation.longitude!,
          movements: [],
        });
      }

      const group = groups.get(key)!;
      group.location = parsedLocation.address;
      group.movements.push(movement);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        movements: [...group.movements].sort((a, b) => compareDates(b.date, a.date)),
      }))
      .sort((a, b) => b.movements.length - a.movements.length);
  }, [movements]);

  const latestMovement = selectedGroup?.movements[0] ?? null;
  const canExpandSheet = (selectedGroup?.movements.length ?? 0) > 1;
  const visibleMovements =
    sheetStep === 'preview'
      ? latestMovement
        ? [latestMovement]
        : []
      : (selectedGroup?.movements ?? []);

  const handleMarkerSelect = (group: LocationGroup) => {
    setSelectedGroup(group);
    setSheetStep('preview');
    cameraRef.current?.setCamera({
      centerCoordinate: [group.longitude, group.latitude],
      zoomLevel: 14,
      animationDuration: 400,
    });
  };

  const closeSheet = () => {
    setSelectedGroup(null);
    setSheetStep('preview');
  };

  const toggleSheetStep = () => {
    if (!canExpandSheet) {
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSheetStep((current) => (current === 'preview' ? 'details' : 'preview'));
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL={mapStyleURL}
        compassEnabled
        scaleBarEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        rotateEnabled
        pitchEnabled
        scrollEnabled
        zoomEnabled
        onPress={() => setSelectedGroup(null)}
      >
        <Mapbox.Camera ref={cameraRef} zoomLevel={5.5} centerCoordinate={DEFAULT_CENTER} />

        {locationGroups.map((group) => (
          <Mapbox.PointAnnotation
            key={group.key}
            id={group.key}
            coordinate={[group.longitude, group.latitude]}
            title={group.location}
            onSelected={() => handleMarkerSelect(group)}
          >
            <View
              style={[
                styles.marker,
                {
                  backgroundColor: primaryColor,
                  borderColor: markerBorderColor,
                },
                selectedGroup?.key === group.key && styles.markerSelected,
              ]}
            />
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      <View style={[styles.infoBadge, { backgroundColor: cardBackground }]}>
        <MaterialIcons name="place" size={16} color={primaryColor} />
        <ThemedText style={[styles.infoBadgeText, { color: textColor }]}>
          {locationGroups.length} posizion
          {locationGroups.length === 1 ? 'e' : 'i'}
        </ThemedText>
      </View>

      <ModalPanel
        isVisible={selectedGroup !== null}
        onClose={closeSheet}
        showConfirmButton={false}
        showCancelButton={false}
        maxHeight={sheetStep === 'preview' ? 260 : EXPANDED_SHEET_HEIGHT}
      >
        {selectedGroup && latestMovement && (
          <View>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <ThemedText style={styles.sheetTitle} numberOfLines={2}>
                  {selectedGroup.location}
                </ThemedText>
                <ThemedText style={[styles.sheetSubtitle, { color: subtextColor }]}>
                  {selectedGroup.movements.length} moviment
                  {selectedGroup.movements.length === 1 ? 'o' : 'i'}
                </ThemedText>
              </View>
              <Pressable
                style={[
                  styles.sheetStepButton,
                  { borderColor, opacity: canExpandSheet ? 1 : 0.35 },
                ]}
                disabled={!canExpandSheet}
                onPress={toggleSheetStep}
              >
                <MaterialIcons
                  name={sheetStep === 'preview' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={20}
                  color={textColor}
                />
              </Pressable>
            </View>

            <View style={[styles.sheetDivider, { backgroundColor: borderColor }]} />

            <ScrollView
              style={sheetStep === 'details' ? styles.movementsList : undefined}
              showsVerticalScrollIndicator={false}
              scrollEnabled={sheetStep === 'details'}
            >
              {visibleMovements.map((movement, index) => {
                const isPreview = sheetStep === 'preview';

                return (
                  <View
                    key={`${movement.id}-${sheetStep}-${index}`}
                    style={
                      isPreview
                        ? [styles.previewCard, { backgroundColor: cardBackground }]
                        : [
                            styles.movementRow,
                            { borderBottomColor: borderColor },
                            index === visibleMovements.length - 1 && styles.movementRowLast,
                          ]
                    }
                  >
                    <View style={styles.previewCardLeft}>
                      <View
                        style={[
                          styles.previewIcon,
                          {
                            backgroundColor: MovementHelper.getMovementColor(
                              movement.type,
                              movement.category,
                              categories,
                            ),
                          },
                        ]}
                      >
                        <IconSymbol
                          name={MovementHelper.getMovementIcon(movement.category, categories)}
                          size={isPreview ? 18 : 16}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.previewTextBlock}>
                        <ThemedText style={styles.previewTitle} numberOfLines={1}>
                          {movement.description}
                        </ThemedText>
                        <ThemedText style={[styles.previewSubtitle, { color: subtextColor }]}>
                          {formatDateForDisplay(movement.date, 'it-IT')} • {movement.category}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText
                      style={[
                        styles.previewAmount,
                        {
                          color: movement.totalAmount > 0 ? positiveAmountColor : textColor,
                        },
                      ]}
                    >
                      {movement.totalAmount > 0 ? '+' : ''}
                      {movement.totalAmount.toFixed(2).replace('.', ',')}€
                    </ThemedText>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ModalPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBadge: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  infoBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  markerSelected: {
    transform: [{ scale: 1.15 }],
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetHeaderLeft: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  sheetStepButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  previewCard: {
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  previewIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTextBlock: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  previewSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  previewAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  movementsList: {
    maxHeight: 280,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  movementRowLast: {
    borderBottomWidth: 0,
  },
});
