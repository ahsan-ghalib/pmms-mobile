import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GoogleLocationMap, SelectedMapLocation } from '../../components/GoogleLocationMap';
import { Text } from '../Text';

import { CustomInput as Input } from '../../components/ui/CustomInput';
import { Button } from '../../components/ui/Button';
import { CustomDropdown, DropdownOption } from '../../components/ui/CustomDropdown';
import { AuthService } from '../../api/services/auth.service';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';

function matchOption(options: DropdownOption[], query?: string) {
  if (!query) return undefined;
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/\b(region|province|governorate|municipality|district|kingdom of)\b/g, '')
      .replace(/\bsaudi\b(?!\s*arabia)/g, 'saudi arabia')
      // Avoid \p{L}/\p{N} — some Hermes builds reject Unicode property escapes at runtime.
      .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const q = normalize(query);
  if (!q) return undefined;

  return options.find((opt) => {
    const label = String(opt.label || '');
    const raw = (opt as any).data || (opt as any).raw || {};
    const names = [raw.name, raw.name_ar, raw.name_arabic, label]
      .filter(Boolean)
      .map((n: string) => normalize(String(n)));
    return names.some((n) => n === q || n.includes(q) || q.includes(n));
  });
}

export default function JoinUsLocationStep({ onNext }: { onNext: () => void }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { login, user } = useAuth();

  const [address, setAddress] = useState('');

  const [selectedCountryId, setSelectedCountryId] = useState<string | number>('');
  const [selectedStateId, setSelectedStateId] = useState<string | number>('');
  const [selectedCityId, setSelectedCityId] = useState<string | number>('');

  const [countries, setCountries] = useState<DropdownOption[]>([]);
  const [states, setStates] = useState<DropdownOption[]>([]);
  const [cities, setCities] = useState<DropdownOption[]>([]);

  const [latitude, setLatitude] = useState('24.7136');
  const [longitude, setLongitude] = useState('46.6753');
  const [pendingGeo, setPendingGeo] = useState<{
    country?: string;
    state?: string;
    city?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient
      .get(ENDPOINTS.DISCOVER.COUNTRIES)
      .then((res: any) => {
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setCountries(
          items.map((c: any) => ({
            id: c.id,
            label: isArabic
              ? c.name_ar || c.name_arabic || c.name
              : c.name || c.name_ar || c.name_arabic,
            data: c,
          })),
        );
      })
      .catch(console.error);
  }, [isArabic]);

  useEffect(() => {
    if (selectedCountryId) {
      apiClient
        .get(`${ENDPOINTS.DISCOVER.STATES}?country_id=${selectedCountryId}`)
        .then((res: any) => {
          const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setStates(
            items.map((s: any) => ({
              id: s.id,
              label: isArabic
                ? s.name_ar || s.name_arabic || s.name
                : s.name || s.name_ar || s.name_arabic,
              data: s,
            })),
          );
        })
        .catch(console.error);
    } else {
      setStates([]);
      setSelectedStateId('');
    }
  }, [selectedCountryId, isArabic]);

  useEffect(() => {
    if (selectedStateId) {
      apiClient
        .get(`${ENDPOINTS.DISCOVER.CITIES}?state_id=${selectedStateId}`)
        .then((res: any) => {
          const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setCities(
            items.map((c: any) => ({
              id: c.id,
              label: isArabic
                ? c.name_ar || c.name_arabic || c.name
                : c.name || c.name_ar || c.name_arabic,
              data: c,
            })),
          );
        })
        .catch(console.error);
    } else {
      setCities([]);
      setSelectedCityId('');
    }
  }, [selectedStateId, isArabic]);

  // Autofill country → state → city from reverse-geocoded map pick
  useEffect(() => {
    if (!pendingGeo) return;

    if (pendingGeo.country && countries.length > 0 && !selectedCountryId) {
      const match = matchOption(countries, pendingGeo.country);
      if (match) {
        setSelectedCountryId(match.id);
        return;
      }
    }

    if (pendingGeo.state && states.length > 0 && selectedCountryId && !selectedStateId) {
      const match = matchOption(states, pendingGeo.state);
      if (match) {
        setSelectedStateId(match.id);
        return;
      }
    }

    if (pendingGeo.city && cities.length > 0 && selectedStateId) {
      const match = matchOption(cities, pendingGeo.city);
      const country = countries.find((c) => c.id === selectedCountryId);
      const state = states.find((s) => s.id === selectedStateId);
      if (match && match.id !== selectedCityId) {
        setSelectedCityId(match.id);
      }
      // Prefer localized dropdown labels for the address field (avoids English reverse-geocode mix)
      const sep = isArabic ? '، ' : ', ';
      const localized = [match?.label || pendingGeo.city, state?.label, country?.label]
        .filter(Boolean)
        .join(sep);
      if (localized) setAddress(localized);
      setPendingGeo(null);
      return;
    }

    // City missing from geocode, or still unmatched after cities loaded — fill what we can
    if (selectedCountryId && selectedStateId && cities.length > 0) {
      const country = countries.find((c) => c.id === selectedCountryId);
      const state = states.find((s) => s.id === selectedStateId);
      const cityMatch = pendingGeo.city ? matchOption(cities, pendingGeo.city) : undefined;
      if (cityMatch && cityMatch.id !== selectedCityId) {
        setSelectedCityId(cityMatch.id);
      }
      const sep = isArabic ? '، ' : ', ';
      const localized = [cityMatch?.label, state?.label, country?.label].filter(Boolean).join(sep);
      if (localized) setAddress(localized);
      setPendingGeo(null);
    }
  }, [
    pendingGeo,
    countries,
    states,
    cities,
    selectedCountryId,
    selectedStateId,
    selectedCityId,
    isArabic,
  ]);

  const handleCitySelect = (opt: DropdownOption) => {
    setSelectedCityId(opt.id);
    if (!address && opt.label) setAddress(String(opt.label));
    if (opt.data?.latitude && opt.data?.longitude) {
      setLatitude(opt.data.latitude.toString());
      setLongitude(opt.data.longitude.toString());
    }
  };

  const handleLocationChange = (location: SelectedMapLocation) => {
    setLatitude(location.latitude.toString());
    setLongitude(location.longitude.toString());

    const geo = {
      country: (location as any).countryName || undefined,
      state: (location as any).stateName || undefined,
      city: location.cityName || undefined,
    };

    // Map pick only — country/state/city/address autofill from dropdown AR labels
    if (geo.country || geo.state || geo.city) {
      setSelectedCountryId('');
      setSelectedStateId('');
      setSelectedCityId('');
      setPendingGeo(geo);
      // Keep prior address until localized autofill lands (avoids English flash)
      if (location.addressName && !/[A-Za-z]{3,}/.test(location.addressName)) {
        setAddress(location.addressName);
      }
    } else if (location.addressName) {
      setAddress(location.addressName);
    }
  };

  const handleNext = async () => {
    if (!address) {
      Alert.alert(t('error'), t('address_required', 'Address is required'));
      return;
    }

    if (!selectedCountryId || !selectedStateId || !selectedCityId) {
      Alert.alert(t('error'), t('location_required', 'Country, State, and City are required'));
      return;
    }

    const countryObj = countries.find((c) => c.id === selectedCountryId);

    setLoading(true);
    try {
      const payload = {
        formatted_address: address,
        country: countryObj?.data?.name || countryObj?.label || '',
        country_id: selectedCountryId.toString(),
        state_id: selectedStateId.toString(),
        city_id: selectedCityId.toString(),
        latitude: latitude,
        longitude: longitude,
      };

      const response: any = await AuthService.updateLocationInfo(payload);
      if (response && response.vendor) {
        const storageObj = require('../../storage/storage').default;
        const token = await storageObj.getToken();

        if (user && token) {
          const updatedUser = { ...user, vendor: response.vendor };
          await login(token, updatedUser);
        } else if (token) {
          await login(token);
        }

        onNext();
      }
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || t('error_occurred', 'An error occurred');
      Alert.alert(t('error'), message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCityObj = cities.find((c) => c.id === selectedCityId);

  return (
    <View className="flex-1 bg-[#FDFDFD]">
      <View className="flex-1">
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow px-6 pb-8 pt-6"
        >
          <Text
            className="text-2xl font-bold text-[#111827] mb-2"
            style={{ fontFamily: isArabic ? 'PlaypenSansArabic_700Bold' : 'Inter_700Bold' }}
          >
            {t('select_location', 'Location Information')}
          </Text>
          <Text
            className="text-sm text-gray-500 mb-6"
            style={{ fontFamily: isArabic ? 'PlaypenSansArabic_400Regular' : 'Inter_400Regular' }}
          >
            {t('step_4_desc', 'Pin your store on the map — address fills in automatically.')}
          </Text>

          <View
            className="mb-6 rounded-[24px] bg-white p-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            {/* Map is primary — pick a pin to autofill address */}
            <View className="mb-4">
              <Text
                className="font-semibold text-[#111827] mb-2"
                style={{
                  fontFamily: isArabic ? 'PlaypenSansArabic_600SemiBold' : 'Inter_600SemiBold',
                }}
              >
                {t('map_location', 'Map Location')}
              </Text>
              <Text
                className="text-xs text-gray-400 mb-3"
                style={{
                  fontFamily: isArabic ? 'PlaypenSansArabic_400Regular' : 'Inter_400Regular',
                }}
              >
                {t(
                  'map_pick_hint',
                  'Move the pin or use your current location to autofill the address.',
                )}
              </Text>
              <View className="rounded-xl overflow-hidden border border-gray-100">
                <GoogleLocationMap
                  initialLocation={{
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    cityName: selectedCityObj?.label || '',
                  }}
                  onLocationChange={handleLocationChange}
                  autoLocateOnMount={true}
                  height={280}
                />
              </View>
            </View>

            <View className="mt-1">
              <Input
                label={t('address', 'Address *')}
                placeholder={t('enter_address', 'Address from map')}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <CustomDropdown
              label={t('country', 'Country *')}
              placeholder={t('select_country', 'Select Country')}
              value={selectedCountryId}
              options={countries}
              onSelect={(opt) => {
                setPendingGeo(null);
                setSelectedCountryId(opt.id);
                setSelectedStateId('');
                setSelectedCityId('');
              }}
            />

            <View className="flex-row justify-between mt-4" style={{ gap: 16 }}>
              <View className="flex-1">
                <CustomDropdown
                  label={t('state', 'State *')}
                  placeholder={t('select_state', 'Select State')}
                  value={selectedStateId}
                  options={states}
                  disabled={!selectedCountryId}
                  onSelect={(opt) => {
                    setPendingGeo(null);
                    setSelectedStateId(opt.id);
                    setSelectedCityId('');
                  }}
                />
              </View>
              <View className="flex-1">
                <CustomDropdown
                  label={t('city', 'City *')}
                  placeholder={t('select_city', 'Select City')}
                  value={selectedCityId}
                  options={cities}
                  disabled={!selectedStateId}
                  onSelect={handleCitySelect}
                />
              </View>
            </View>
          </View>

          <View className="mt-2">
            <Button
              title={t('submit_btn', 'Submit Application')}
              onPress={handleNext}
              loading={loading}
              disabled={loading}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
