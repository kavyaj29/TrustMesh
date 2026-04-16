// MeshScreen - Device Registration and Location Tracking
// Part of the Delegated Trust Protocol

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    RefreshControl,
    Platform,
} from 'react-native';
import * as Device from 'expo-device';
import api from '../services/api';
import locationService from '../services/location';

export default function MeshScreen() {
    const [alias, setAlias] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState({ deviceId: null, alias: null });
    const [isTracking, setIsTracking] = useState(false);
    const [meshDevices, setMeshDevices] = useState([]);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Load device info on mount
    useEffect(() => {
        loadDeviceInfo();
        loadMeshDevices();
        checkTrackingStatus();
    }, []);

    const loadDeviceInfo = async () => {
        const info = await locationService.getDeviceInfo();
        setDeviceInfo(info);
        setIsRegistered(!!info.deviceId);
        if (info.alias) setAlias(info.alias);
    };

    const checkTrackingStatus = async () => {
        const active = await locationService.isTrackingActive();
        setIsTracking(active);
    };

    const loadMeshDevices = async () => {
        try {
            const devices = await api.getMeshLocations();
            setMeshDevices(devices);
        } catch (error) {
            console.log('Error loading mesh:', error);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadMeshDevices();
        await checkTrackingStatus();
        setRefreshing(false);
    }, []);

    const handleRegister = async () => {
        if (!alias.trim()) {
            Alert.alert('Error', 'Please enter a device alias (e.g., Sister, Father)');
            return;
        }

        setLoading(true);
        try {
            // Generate unique device ID
            const deviceUuid = `${Device.modelName}-${Device.osVersion}-${Date.now()}`;

            const result = await api.registerDevice(deviceUuid, alias.trim());
            await locationService.saveDeviceInfo(result.id, result.alias);

            setDeviceInfo({ deviceId: result.id, alias: result.alias });
            setIsRegistered(true);
            Alert.alert('Success', `Device registered as "${result.alias}"`);
        } catch (error) {
            Alert.alert('Error', error.message);
        }
        setLoading(false);
    };

    const handleToggleTracking = async () => {
        setLoading(true);
        try {
            if (isTracking) {
                await locationService.stopLocationTracking();
                setIsTracking(false);
                Alert.alert('Stopped', 'Location tracking has been stopped');
            } else {
                await locationService.startLocationTracking();
                setIsTracking(true);
                Alert.alert('Started', 'Location tracking is now active');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        }
        setLoading(false);
    };

    const handleUpdateLocation = async () => {
        setLoading(true);
        try {
            const location = await locationService.getCurrentLocation();
            if (location) {
                setCurrentLocation(location);
                await locationService.uploadLocation(location.latitude, location.longitude, location.accuracy);
                Alert.alert('Updated', 'Location sent to mesh');
                await loadMeshDevices();
            } else {
                Alert.alert('Error', 'Could not get location');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        }
        setLoading(false);
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>🛡️ Trust Mesh</Text>
                <Text style={styles.subtitle}>Delegated Trust Protocol</Text>
            </View>

            {/* Registration Section */}
            {!isRegistered ? (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Register Device</Text>
                    <Text style={styles.description}>
                        Register this device to participate in transaction verification.
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Device Alias (e.g., Sister, Father)"
                        placeholderTextColor="#64748B"
                        value={alias}
                        onChangeText={setAlias}
                    />
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Registering...' : '📱 Register Device'}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Device Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Your Device</Text>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Alias</Text>
                            <Text style={styles.infoValue}>{deviceInfo.alias}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Device ID</Text>
                            <Text style={styles.infoValue}>#{deviceInfo.deviceId}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <Text style={[styles.infoValue, isTracking ? styles.activeText : styles.inactiveText]}>
                                {isTracking ? '🟢 Tracking Active' : '🔴 Tracking Off'}
                            </Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Controls</Text>
                        <TouchableOpacity
                            style={[styles.button, isTracking ? styles.buttonDanger : styles.buttonSuccess]}
                            onPress={handleToggleTracking}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {isTracking ? '⏹️ Stop Tracking' : '▶️ Start Tracking'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonSecondary]}
                            onPress={handleUpdateLocation}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>📍 Update Location Now</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Current Location */}
                    {currentLocation && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Last Location</Text>
                            <Text style={styles.locationText}>
                                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                            </Text>
                            <Text style={styles.accuracyText}>
                                Accuracy: ±{currentLocation.accuracy?.toFixed(0)}m
                            </Text>
                        </View>
                    )}
                </>
            )}

            {/* Mesh Members */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mesh Members</Text>
                {meshDevices.length === 0 ? (
                    <Text style={styles.emptyText}>No active devices in mesh</Text>
                ) : (
                    meshDevices.map((device, index) => (
                        <View key={index} style={styles.deviceCard}>
                            <View style={styles.deviceHeader}>
                                <Text style={styles.deviceAlias}>📱 {device.alias}</Text>
                                <Text style={styles.deviceTime}>
                                    {new Date(device.timestamp).toLocaleTimeString()}
                                </Text>
                            </View>
                            <Text style={styles.deviceLocation}>
                                {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                            </Text>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#1E293B',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#FFFFFF',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    button: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonSecondary: {
        backgroundColor: '#475569',
    },
    buttonSuccess: {
        backgroundColor: '#10B981',
    },
    buttonDanger: {
        backgroundColor: '#EF4444',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    infoCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#1E293B',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    infoLabel: {
        color: '#94A3B8',
        fontSize: 14,
    },
    infoValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    activeText: {
        color: '#10B981',
    },
    inactiveText: {
        color: '#EF4444',
    },
    locationText: {
        color: '#3B82F6',
        fontSize: 16,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    accuracyText: {
        color: '#64748B',
        fontSize: 12,
        marginTop: 4,
    },
    emptyText: {
        color: '#64748B',
        fontStyle: 'italic',
    },
    deviceCard: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    deviceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    deviceAlias: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    deviceTime: {
        color: '#64748B',
        fontSize: 12,
    },
    deviceLocation: {
        color: '#94A3B8',
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});
