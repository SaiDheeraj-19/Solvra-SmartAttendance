'use client';

import { useState, useEffect } from 'react';
import { MapPin, Loader2, Save, RotateCcw } from 'lucide-react';

export default function AdminGeofenceUpdater() {
  const [formData, setFormData] = useState({
    lat: '15.797113', // Default fallback
    lng: '78.077443',
    radius: '1000'
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch current geofence on mount
  useEffect(() => {
    fetchGeofence();
  }, []);

  const fetchGeofence = async () => {
    setFetching(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/admin/geofence', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success && data.geofence) {
        setFormData({
          lat: String(data.geofence.center?.lat || 15.797113),
          lng: String(data.geofence.center?.lng || 78.077443),
          radius: String(data.geofence.radiusMeters || 1000)
        });
      }
    } catch (err) {
      console.error('Error fetching geofence:', err);
      // Don't show error to user immediately, just use defaults
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude)
        }));
        setLoading(false);
        setMessage('Coordinates updated to your current location!');
        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      },
      (err) => {
        setLoading(false);
        setError(`Error getting location: ${err.message}. Please ensure location services are enabled.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const lat = parseFloat(formData.lat);
      const lng = parseFloat(formData.lng);
      const radius = parseFloat(formData.radius);

      if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
        throw new Error('Please enter valid numbers for latitude, longitude, and radius');
      }

      const response = await fetch('/api/admin/geofence', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          center: {
            lat: lat,
            lng: lng
          },
          radiusMeters: radius
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Failed to update geofence');
      }

      setMessage('Geofence updated successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating geofence';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading current geofence...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <MapPin className="mr-2 h-6 w-6 text-blue-600" />
          Update Campus Geofence
        </h2>
        <button
          onClick={fetchGeofence}
          className="text-gray-500 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          title="Refresh Data"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Current Coordinates</h3>
              <p className="text-sm text-blue-700">
                Click the button to automatically set the coordinates to your current physical location.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={loading}
              className="flex items-center bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors shadow-sm font-medium whitespace-nowrap"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Use My Location
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Latitude
            </label>
            <input
              type="text"
              inputMode="decimal"
              name="lat"
              value={formData.lat}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Longitude
            </label>
            <input
              type="text"
              inputMode="decimal"
              name="lng"
              value={formData.lng}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Radius (meters)
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              name="radius"
              value={formData.radius}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 text-sm">
              meters
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Recommended: 500-1000m for typical campuses.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 flex justify-center items-center font-medium shadow-md transition-all transform active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Updating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Update Geofence
            </>
          )}
        </button>
      </form>

      {message && (
        <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-100 flex items-start animate-fade-in">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-start animate-fade-in">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-100">
        <h3 className="font-medium text-gray-800 mb-3 flex items-center">
          <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">?</span>
          Instructions
        </h3>
        <ul className="list-disc pl-9 text-sm text-gray-600 space-y-2">
          <li><strong>Best Practice:</strong> Go to the physical center of your campus or classroom.</li>
          <li>Click <strong>&quot;Use My Location&quot;</strong> to auto-fill your exact coordinates.</li>
          <li>Set a <strong>Radius</strong> large enough to cover the entire area (e.g., 500m for a large campus).</li>
          <li>Click <strong>Update</strong> to save. Changes apply immediately for all students.</li>
        </ul>
      </div>
    </div>
  );
}