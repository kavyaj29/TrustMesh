// Location Service for Delegated Trust Protocol
// Handles GPS tracking and telemetry uploads

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const LOCATION_TASK_NAME = 'background-location-task';
const DEVICE_ID_KEY = '@mesh_device_id';
const DEVICE_ALIAS_KEY = '@mesh_device_alias';

// Storage helpers
export const getDeviceInfo = async () => {
    try {
        const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
        const alias = await AsyncStorage.getItem(DEVICE_ALIAS_KEY);
        return { deviceId: deviceId ? parseInt(deviceId) : null, alias };
    } catch (error) {
        console.error('Error getting device info:', error);
        return { deviceId: null, alias: null };
    }
};

export const saveDeviceInfo = async (deviceId, alias) => {
    try {
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId.toString());
        await AsyncStorage.setItem(DEVICE_ALIAS_KEY, alias);
    } catch (error) {
        console.error('Error saving device info:', error);
    }
};

// Request location permissions
export const requestPermissions = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
        return { granted: false, error: 'Foreground location permission denied' };
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
        return { granted: false, error: 'Background location permission denied' };
    }

    return { granted: true };
};

// Get current location
export const getCurrentLocation = async () => {
    try {
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });
        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
        };
    } catch (error) {
        console.error('Error getting location:', error);
        return null;
    }
};

// Upload location to mesh backend
export const uploadLocation = async (latitude, longitude, accuracy) => {
    const { deviceId } = await getDeviceInfo();
    if (!deviceId) {
        console.log('Device not registered, skipping upload');
        return null;
    }

    try {
        const result = await api.updateTelemetry(deviceId, latitude, longitude, accuracy);
        console.log('Location uploaded:', result);
        return result;
    } catch (error) {
        console.error('Error uploading location:', error);
        return null;
    }
};

// Start background location tracking
export const startLocationTracking = async () => {
    const permissions = await requestPermissions();
    if (!permissions.granted) {
        throw new Error(permissions.error);
    }

    const { deviceId } = await getDeviceInfo();
    if (!deviceId) {
        throw new Error('Device not registered. Please register first.');
    }

    // Check if already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (isRunning) {
        console.log('Location tracking already running');
        return true;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // 1 minute
        distanceInterval: 50, // 50 meters
        foregroundService: {
            notificationTitle: 'Trust Mesh Active',
            notificationBody: 'Sharing location for transaction verification',
            notificationColor: '#3B82F6',
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
    });

    console.log('Background location tracking started');
    return true;
};

// Stop background location tracking
export const stopLocationTracking = async () => {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('Background location tracking stopped');
    }
    return true;
};

// Check if tracking is active
export const isTrackingActive = async () => {
    try {
        return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    } catch {
        return false;
    }
};

// Define background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background location error:', error);
        return;
    }

    if (data) {
        const { locations } = data;
        const location = locations[0];

        if (location) {
            await uploadLocation(
                location.coords.latitude,
                location.coords.longitude,
                location.coords.accuracy
            );
        }
    }
});

export default {
    requestPermissions,
    getCurrentLocation,
    uploadLocation,
    startLocationTracking,
    stopLocationTracking,
    isTrackingActive,
    getDeviceInfo,
    saveDeviceInfo,
};
