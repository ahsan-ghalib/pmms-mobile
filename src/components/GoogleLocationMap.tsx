import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
  Text,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { CustomDropdown, DropdownOption } from './ui/CustomDropdown';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import { resolveDeviceCoordinates } from '../utils/resolveDeviceCoordinates';

export type SelectedMapLocation = {
  latitude: number;
  longitude: number;
  cityName: string;
  addressName?: string;
  postalCode?: string;
  countryName?: string;
  stateName?: string;
};

type GoogleLocationMapProps = {
  initialLocation?: Partial<SelectedMapLocation>;
  onLocationChange?: (location: SelectedMapLocation) => void;
  autoLocateOnMount?: boolean;
  height?: number;
  hideInlineMap?: boolean;
  controlledFullScreen?: boolean;
  onCloseFullScreen?: () => void;
};

const defaultRegion = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const googleMapsApiKeyConfigured = Boolean(Constants.expoConfig?.extra?.googleMapsApiKeyConfigured);

function getCityName(address?: Location.LocationGeocodedAddress) {
  return (
    address?.city ||
    address?.subregion ||
    address?.district ||
    address?.region ||
    address?.name ||
    ''
  );
}

/** Drop Latin-only reverse-geocode scraps so AR UI does not show "Riyadh Region, Saudi". */
function buildLocalizedAddressName(
  addr: Location.LocationGeocodedAddress | undefined,
  isArabic: boolean,
): string {
  if (!addr) return '';
  if (!isArabic) {
    return [addr.street, addr.city, addr.region, addr.country].filter(Boolean).join(', ');
  }
  const hasArabic = (value: string) => /[\u0600-\u06FF]/.test(value);
  const parts = [addr.street, addr.name, addr.city, addr.district, addr.subregion]
    .map((p) => (p || '').trim())
    .filter((p) => p.length > 0 && hasArabic(p));
  // Prefer empty — parents autofill from AR dropdown labels
  return [...new Set(parts)].join('، ');
}

export function GoogleLocationMap({
  initialLocation,
  onLocationChange,
  autoLocateOnMount = false,
  height = 300,
  hideInlineMap = false,
  controlledFullScreen,
  onCloseFullScreen,
}: GoogleLocationMapProps) {
  const { t, i18n } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const fullScreenMapRef = useRef<MapView>(null);

  const [selectedLocation, setSelectedLocation] = useState<SelectedMapLocation>({
    latitude: initialLocation?.latitude || defaultRegion.latitude,
    longitude: initialLocation?.longitude || defaultRegion.longitude,
    cityName: initialLocation?.cityName || '',
  });

  const [mapReady, setMapReady] = useState(false);
  const [fullMapReady, setFullMapReady] = useState(false);
  const [mapTakingLong, setMapTakingLong] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  /** Auto-mount locate runs once; failures stay silent (no red flicker). */
  const didAutoLocateRef = useRef(false);

  const [localIsFullScreen, setLocalIsFullScreen] = useState(false);
  const isFullScreen =
    controlledFullScreen !== undefined ? controlledFullScreen : localIsFullScreen;

  const handleCloseFullScreen = () => {
    if (onCloseFullScreen) onCloseFullScreen();
    else setLocalIsFullScreen(false);
  };

  const handleOpenFullScreen = () => {
    setLocalIsFullScreen(true);
  };
  const [countries, setCountries] = useState<DropdownOption[]>([]);
  const [states, setStates] = useState<DropdownOption[]>([]);
  const [cities, setCities] = useState<DropdownOption[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | number>('');
  const [selectedState, setSelectedState] = useState<string | number>('');
  const [selectedCity, setSelectedCity] = useState<string | number>('');
  const [autoSelectLocation, setAutoSelectLocation] = useState<{
    country?: string;
    state?: string;
    city?: string;
  } | null>(null);

  const notifyLocation = useCallback(
    (location: SelectedMapLocation) => {
      setSelectedLocation(location);
      onLocationChange?.(location);
    },
    [onLocationChange],
  );

  useEffect(() => {
    const nextLocation = {
      latitude: initialLocation?.latitude || defaultRegion.latitude,
      longitude: initialLocation?.longitude || defaultRegion.longitude,
      cityName: initialLocation?.cityName || '',
    };

    setSelectedLocation(nextLocation);

    if (initialLocation?.latitude && initialLocation?.longitude) {
      mapRef.current?.animateToRegion(
        {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.02,
        },
        500,
      );
      fullScreenMapRef.current?.animateToRegion(
        {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.02,
        },
        500,
      );
    }
  }, [initialLocation?.cityName, initialLocation?.latitude, initialLocation?.longitude]);

  useEffect(() => {
    if (isFullScreen && countries.length === 0) {
      apiClient
        .get(ENDPOINTS.DISCOVER.COUNTRIES)
        .then((res: any) => {
          const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          const mapped = items.map((c: any) => ({
            id: c.id,
            label:
              i18n.language === 'ar'
                ? c.name_ar || c.name_arabic || c.name
                : c.name || c.name_ar || c.name_arabic,
            raw: c,
          }));
          setCountries(mapped);

          if (autoSelectLocation?.country) {
            const query = autoSelectLocation.country.toLowerCase();
            const found = mapped.find(
              (c) =>
                (c.raw.name && c.raw.name.toLowerCase().includes(query)) ||
                (c.raw.name_ar && c.raw.name_ar.includes(query)) ||
                query.includes(c.raw.name?.toLowerCase() || '-----'),
            );
            if (found) setSelectedCountry(found.id);
          }
        })
        .catch(console.error);
    }
  }, [isFullScreen, i18n.language]);

  useEffect(() => {
    if (selectedCountry) {
      apiClient
        .get(`${ENDPOINTS.DISCOVER.STATES}?country_id=${selectedCountry}`)
        .then((res: any) => {
          const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          const mapped = items.map((s: any) => ({
            id: s.id,
            label:
              i18n.language === 'ar'
                ? s.name_ar || s.name_arabic || s.name
                : s.name || s.name_ar || s.name_arabic,
            raw: s,
          }));
          setStates(mapped);

          if (autoSelectLocation?.state) {
            const query = autoSelectLocation.state.toLowerCase();
            const found = mapped.find(
              (s) =>
                (s.raw.name && s.raw.name.toLowerCase().includes(query)) ||
                (s.raw.name_ar && s.raw.name_ar.includes(query)) ||
                query.includes(s.raw.name?.toLowerCase() || '-----'),
            );
            if (found) setSelectedState(found.id);
          }
        })
        .catch(console.error);
    } else {
      setStates([]);
      setSelectedState('');
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedCountry, i18n.language]);

  useEffect(() => {
    if (selectedState) {
      apiClient
        .get(`${ENDPOINTS.DISCOVER.CITIES}?state_id=${selectedState}`)
        .then((res: any) => {
          const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          const mapped = items.map((c: any) => ({
            id: c.id,
            label:
              i18n.language === 'ar'
                ? c.name_ar || c.name_arabic || c.name
                : c.name || c.name_ar || c.name_arabic,
            raw: c,
          }));
          setCities(mapped);

          if (autoSelectLocation?.city) {
            const query = autoSelectLocation.city.toLowerCase();
            const found = mapped.find(
              (c) =>
                (c.raw.name && c.raw.name.toLowerCase().includes(query)) ||
                (c.raw.name_ar && c.raw.name_ar.includes(query)) ||
                query.includes(c.raw.name?.toLowerCase() || '-----'),
            );
            if (found) {
              setSelectedCity(found.id);
              setAutoSelectLocation(null); // Done with auto-selection cascade
            }
          }
        })
        .catch(console.error);
    } else {
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedState, i18n.language]);

  useEffect(() => {
    if (!autoSelectLocation) return;

    // 1. Check Country
    if (autoSelectLocation.country && countries.length > 0) {
      const q = autoSelectLocation.country.toLowerCase();
      const c = countries.find(
        (x: any) =>
          x.raw?.name?.toLowerCase().includes(q) ||
          x.raw?.name_ar?.includes(q) ||
          q.includes(x.raw?.name?.toLowerCase() || '-----'),
      );
      if (c && c.id !== selectedCountry) {
        setSelectedCountry(c.id);
        return; // wait for states to load
      }
    }

    // 2. Check State
    if (autoSelectLocation.state && states.length > 0 && selectedCountry) {
      const q = autoSelectLocation.state.toLowerCase();
      const s = states.find(
        (x: any) =>
          x.raw?.name?.toLowerCase().includes(q) ||
          x.raw?.name_ar?.includes(q) ||
          q.includes(x.raw?.name?.toLowerCase() || '-----'),
      );
      if (s && s.id !== selectedState) {
        setSelectedState(s.id);
        return; // wait for cities to load
      }
    }

    // 3. Check City
    if (autoSelectLocation.city && cities.length > 0 && selectedState) {
      const q = autoSelectLocation.city.toLowerCase();
      const ci = cities.find(
        (x: any) =>
          x.raw?.name?.toLowerCase().includes(q) ||
          x.raw?.name_ar?.includes(q) ||
          q.includes(x.raw?.name?.toLowerCase() || '-----'),
      );
      if (ci && ci.id !== selectedCity) {
        setSelectedCity(ci.id);
        setAutoSelectLocation(null); // Complete
      }
    }
  }, [autoSelectLocation, countries, states, cities, selectedCountry, selectedState, selectedCity]);

  const handleCitySelect = async (val: string | number) => {
    setSelectedCity(val);
    const cityOpt = cities.find((c) => c.id === val);
    const countryOpt = countries.find((c) => c.id === selectedCountry);
    if (cityOpt) {
      try {
        const query = cityOpt.label + (countryOpt ? ', ' + countryOpt.label : '');
        const geo = await Location.geocodeAsync(query);
        if (geo.length > 0) {
          const { latitude, longitude } = geo[0];
          focusMap(latitude, longitude, true);
          resolveCityAndSetLocation(latitude, longitude);
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }
  };

  const resolveCityAndSetLocation = useCallback(
    async (latitude: number, longitude: number) => {
      setLocationError(null);
      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        const addr = addresses[0];
        const isArabic = i18n.language?.startsWith('ar');
        const fullAddr = buildLocalizedAddressName(addr, !!isArabic);

        if (addr) {
          setAutoSelectLocation({
            country: addr.country || '',
            state: addr.region || addr.subregion || '',
            city: addr.city || addr.district || addr.subregion || '',
          });
        }

        notifyLocation({
          latitude,
          longitude,
          cityName: getCityName(addr),
          addressName: fullAddr,
          postalCode: addr?.postalCode || '',
          countryName: addr?.country || '',
          stateName: addr?.region || addr?.subregion || '',
        });
      } catch (err) {
        notifyLocation({
          latitude,
          longitude,
          cityName: '',
        });
      }
    },
    [notifyLocation, i18n.language],
  );

  const focusMap = useCallback((latitude: number, longitude: number, isFull = false) => {
    const nextRegion: Region = {
      latitude,
      longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.02,
    };

    if (isFull) {
      fullScreenMapRef.current?.animateToRegion(nextRegion, 500);
    } else {
      mapRef.current?.animateToRegion(nextRegion, 500);
    }
  }, []);

  const useCurrentLocation = useCallback(
    async (isFull = false, opts?: { userInitiated?: boolean }) => {
      const userInitiated = opts?.userInitiated === true;

      setLoadingLocation(true);
      // Always clear stale error on a new locate attempt (stops flicker)
      setLocationError(null);

      try {
        const coords = await resolveDeviceCoordinates();

        if (!coords) {
          // Auto-mount locate stays silent — only button tap shows error
          if (userInitiated) {
            setLocationError(
              t(
                'location_unavailable_hint',
                'Unable to get your location. On Simulator set Features → Location to Apple or a Custom Location.',
              ),
            );
          }
          return;
        }

        focusMap(coords.latitude, coords.longitude, isFull);
        await resolveCityAndSetLocation(coords.latitude, coords.longitude);
        setLocationError(null);
      } catch (err) {
        if (userInitiated) {
          setLocationError(
            t(
              'location_unavailable_hint',
              'Unable to get your location. On Simulator set Features → Location to Apple or a Custom Location.',
            ),
          );
        }
      } finally {
        setLoadingLocation(false);
      }
    },
    [focusMap, resolveCityAndSetLocation, t],
  );

  useEffect(() => {
    if (!autoLocateOnMount || didAutoLocateRef.current) {
      return;
    }
    didAutoLocateRef.current = true;
    useCurrentLocation(false, { userInitiated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, [autoLocateOnMount]);

  useEffect(() => {
    if (mapReady || !googleMapsApiKeyConfigured) {
      return;
    }

    const timer = setTimeout(() => {
      setMapTakingLong(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [mapReady]);

  return (
    <View>
      {!hideInlineMap && (
        <View
          className="overflow-hidden rounded-[18px] border border-gray-200 bg-gray-100"
          style={{ height }}
        >
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              latitudeDelta: defaultRegion.latitudeDelta,
              longitudeDelta: defaultRegion.longitudeDelta,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            loadingEnabled
            loadingBackgroundColor="#F3F4F6"
            loadingIndicatorColor="#8E54E9"
            onMapReady={() => setMapReady(true)}
            onMapLoaded={() => setMapReady(true)}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }}
              title={selectedLocation.cityName || t('selected_location', 'Selected location')}
            />
          </MapView>

          {googleMapsApiKeyConfigured && !mapReady && (
            <View className="absolute inset-0 items-center justify-center bg-gray-100 px-6">
              <ActivityIndicator color="#8E54E9" />
              <Text className="mt-3 text-center text-sm font-bold text-gray-900">
                {t('loading_google_map', 'Loading Google Map...')}
              </Text>
              {mapTakingLong && (
                <Text className="mt-1 text-center text-xs font-medium text-gray-500">
                  {t(
                    'maps_blank_hint',
                    'If it stays blank, rebuild the app so the native Google Maps key is applied.',
                  )}
                </Text>
              )}
            </View>
          )}

          {!googleMapsApiKeyConfigured && (
            <View className="absolute inset-0 items-center justify-center bg-gray-100 px-6">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-[#F3E8FF]">
                <Ionicons name="map" size={24} color="#8E54E9" />
              </View>
              <Text className="text-center text-sm font-bold text-gray-900">
                {t('maps_key_missing', 'Google Maps key missing')}
              </Text>
              <Text className="mt-1 text-center text-xs font-medium text-gray-500">
                {t(
                  'maps_key_missing_hint',
                  'Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY and rebuild the app.',
                )}
              </Text>
            </View>
          )}

          {/* Overlay to catch taps on the inline map */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => handleOpenFullScreen()}
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          />
        </View>
      )}

      {locationError && (
        <Text className="mt-2 text-xs font-medium text-red-500">{locationError}</Text>
      )}

      {/* Full Screen Modal Map */}
      <Modal
        visible={isFullScreen}
        animationType="slide"
        onRequestClose={() => handleCloseFullScreen()}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flex: 1 }}>
            <MapView
              ref={fullScreenMapRef}
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
                latitudeDelta: defaultRegion.latitudeDelta,
                longitudeDelta: defaultRegion.longitudeDelta,
              }}
              showsUserLocation
              showsMyLocationButton={false}
              loadingEnabled
              loadingBackgroundColor="#F3F4F6"
              loadingIndicatorColor="#8E54E9"
              onMapReady={() => setFullMapReady(true)}
              onMapLoaded={() => setFullMapReady(true)}
              onPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                resolveCityAndSetLocation(latitude, longitude);
              }}
            >
              <Marker
                coordinate={{
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                }}
                title={selectedLocation.cityName || t('selected_location', 'Selected location')}
                draggable
                onDragEnd={(event) => {
                  const { latitude, longitude } = event.nativeEvent.coordinate;
                  resolveCityAndSetLocation(latitude, longitude);
                }}
              />
            </MapView>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => useCurrentLocation(true, { userInitiated: true })}
              disabled={loadingLocation}
              className="absolute right-4 bottom-[230px] h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {loadingLocation ? (
                <ActivityIndicator color="#8E54E9" />
              ) : (
                <Ionicons name="locate" size={22} color="#8E54E9" />
              )}
            </TouchableOpacity>
            {/* Floating Dropdowns over map */}
            <View className="absolute bottom-4 left-4 right-4 z-20">
              <View
                className="p-4 rounded-3xl"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  shadowColor: '#8E54E9',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 10,
                  borderWidth: 1,
                  borderColor: 'rgba(142, 84, 233, 0.2)',
                }}
              >
                <Text className="text-[13px] font-bold text-gray-800 mb-3 ml-1">
                  {t('refine_location', 'Refine Location Details')}
                </Text>
                <View className="flex-row space-x-2">
                  <View className="flex-1">
                    <CustomDropdown
                      options={countries}
                      value={selectedCountry}
                      onSelect={(opt) => setSelectedCountry(opt.id)}
                      placeholder={t('country', 'Country')}
                    />
                  </View>
                  <View className="flex-1 ml-2">
                    <CustomDropdown
                      options={states}
                      value={selectedState}
                      onSelect={(opt) => setSelectedState(opt.id)}
                      placeholder={t('state', 'State')}
                      disabled={!selectedCountry}
                    />
                  </View>
                </View>
                <View className="mt-3">
                  <CustomDropdown
                    options={cities}
                    value={selectedCity}
                    onSelect={(opt) => handleCitySelect(opt.id)}
                    placeholder={t('city', 'City')}
                    disabled={!selectedState}
                  />
                </View>
              </View>
            </View>
          </View>

          <View
            className="px-4 pt-3 pb-8 bg-white border-t border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 20,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleCloseFullScreen()}
              className="w-full py-4 rounded-[20px] items-center flex-row justify-center space-x-2 mb-3"
              style={{
                backgroundColor: '#8E54E9',
                shadowColor: '#8E54E9',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons name="location" size={20} color="#fff" />
              <Text className="text-white font-bold text-[16px] ml-2">
                {t('confirm_location', 'Confirm Location')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleCloseFullScreen()}
              className="w-full py-3.5 rounded-[20px] items-center justify-center border border-gray-200 bg-gray-50"
            >
              <Text className="text-gray-600 font-bold text-[15px]">{t('cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
