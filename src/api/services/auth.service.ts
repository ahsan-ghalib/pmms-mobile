import apiClient from '../apiClient';
import { ENDPOINTS } from '../endpoints';

export const AuthService = {
  login(data: any) {
    return apiClient.post(ENDPOINTS.AUTH.LOGIN, data);
  },

  logout() {
    return apiClient.post(ENDPOINTS.AUTH.LOGOUT);
  },

  deleteAccount() {
    return apiClient.post(ENDPOINTS.AUTH.DELETE_ACCOUNT);
  },

  register(data: any) {
    return apiClient.post(ENDPOINTS.AUTH.REGISTER, data);
  },

  requestOtp() {
    return apiClient.post(ENDPOINTS.AUTH.REQUEST_OTP);
  },

  verifyOtp(data: { otp: string }) {
    return apiClient.post(ENDPOINTS.AUTH.VERIFY_OTP, data);
  },

  addAddress(data: any) {
    return apiClient.post(ENDPOINTS.AUTH.ADD_ADDRESS, data);
  },

  getCountries() {
    return apiClient.get(ENDPOINTS.DISCOVER.COUNTRIES);
  },

  getStates(countryId?: string | number) {
    const url = countryId
      ? `${ENDPOINTS.DISCOVER.STATES}?country_id=${countryId}`
      : ENDPOINTS.DISCOVER.STATES;
    return apiClient.get(url);
  },

  getCities(stateId?: string | number) {
    const url = stateId
      ? `${ENDPOINTS.DISCOVER.CITIES}?state_id=${stateId}`
      : ENDPOINTS.DISCOVER.CITIES;
    return apiClient.get(url);
  },

  profile() {
    return apiClient.get(ENDPOINTS.AUTH.PROFILE);
  },

  updateProfile(data: any) {
    return apiClient.put(ENDPOINTS.AUTH.UPDATE_PROFILE, data);
  },

  updateLanguage(language: 'en' | 'ar') {
    return apiClient.put(ENDPOINTS.AUTH.UPDATE_LANGUAGE, { language });
  },

  changePassword(data: any) {
    return apiClient.put(ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  updateActivityInfo(data: any) {
    return apiClient.post(ENDPOINTS.AUTH.ACTIVITY_INFO, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateBusinessInfo(data: any) {
    return apiClient.post(ENDPOINTS.AUTH.BUSINESS_INFO, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateLocationInfo(data: any) {
    return apiClient.post(ENDPOINTS.AUTH.LOCATION_INFO, data);
  },
};
