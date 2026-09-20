'use client';

import { useState } from 'react';
// import { authAPI } from '@/services/api';

export default function LocationDebugger() {

  interface LocationTestResult {
    insideCampus: boolean;
    message: string;
    distance: {
      kilometers: number;
      meters: number;
    };
    geofence: {
      center: {
        lat: number;
        lng: number;
      };
      radiusMeters: number;
      source: string;
    };
  }
  const [location, setLocation] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LocationTestResult | null>(null);
  const [permission, setPermission] = useState<string>('unknown');

  // Get current location
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setPermission('granted');
        setLoading(false);
      },
      (err) => {
        setError(`Unable to retrieve your location: ${err.message}`);
        setPermission('denied');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Test location against backend
  const testLocation = async () => {
    if (location.lat === null || location.lng === null) {
      setError('Please get your current location first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/attendance/test-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to test location');
      }

      setResult(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while testing location';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Location Debugger</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Current Location Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Permission</p>
            <p className={`font-medium ${permission === 'granted' ? 'text-green-600' : permission === 'denied' ? 'text-red-600' : 'text-yellow-600'}`}>
              {permission === 'granted' ? 'Granted' : permission === 'denied' ? 'Denied' : 'Not Requested'}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Coordinates</p>
            {location.lat !== null && location.lng !== null ? (
              <p className="font-medium text-gray-800">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            ) : (
              <p className="font-medium text-gray-500">Not Available</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={getCurrentLocation}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Getting Location...' : 'Get My Location'}
        </button>

        <button
          onClick={testLocation}
          disabled={loading || location.lat === null || location.lng === null}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          Test Against Campus
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Location Test Results</h3>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-blue-600">Status</p>
              <p className={`font-medium ${result.insideCampus ? 'text-green-600' : 'text-red-600'}`}>
                {result.message}
              </p>
            </div>

            <div>
              <p className="text-sm text-blue-600">Distance from Campus Center</p>
              <p className="font-medium text-gray-800">
                {result.distance.kilometers.toFixed(3)} km ({result.distance.meters.toFixed(2)} m)
              </p>
            </div>

            <div>
              <p className="text-sm text-blue-600">Campus Geofence</p>
              <p className="font-medium text-gray-800">
                Center: {result.geofence.center.lat.toFixed(6)}, {result.geofence.center.lng.toFixed(6)}<br />
                Radius: {result.geofence.radiusMeters} meters<br />
                Source: {result.geofence.source}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600">
        <h4 className="font-semibold mb-2">Troubleshooting Tips:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Ensure location permissions are granted for this site</li>
          <li>Check that your device&apos;s GPS is enabled</li>
          <li>If you&apos;re outside campus, you won&apos;t be able to check in</li>
          <li>Try increasing the geofence radius in admin settings</li>
          <li>GPS accuracy can vary - try again in an open area</li>
        </ul>
      </div>
    </div>
  );
}