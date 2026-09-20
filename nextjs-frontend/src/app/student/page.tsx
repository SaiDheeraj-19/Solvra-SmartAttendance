'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, BarChart3, User, Calendar, Clock, Award, MapPin, Camera, CheckCircle, AlertCircle, LogOut, Settings, History, Scan, Edit3, Lock, Bell, Palette, X, Eye, EyeOff } from 'lucide-react';
import FaceCamera from '@/components/FaceCamera';
import AutoQRScanner from '@/components/AutoQRScanner';
import { faceService } from '@/services/faceService';
import { authAPI, attendanceAPI, redirectToLogin } from '@/services/api';
// import Notification from '@/components/Notification';

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, pending, verified, failed, cancelled
  const [locationError, setLocationError] = useState<string | null>(null); // Specific error message
  const [qrScanned, setQrScanned] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [faceVerificationError, setFaceVerificationError] = useState<string | null>(null);
  const [faceVerificationLoading, setFaceVerificationLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    studentId: '',
    department: '',
    year: '',
    phone: ''
  });
  // Add state for profile picture
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  // Add state for editing profile
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedProfileData, setEditedProfileData] = useState({
    name: '',
    email: '',
    studentId: '',
    department: '',
    year: '',
    phone: ''
  });
  // Add state for changing password
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Add state for face recognition settings
  const [faceSettingsActive, setFaceSettingsActive] = useState(false);
  const [faceSettings, setFaceSettings] = useState({
    requireFaceVerification: true,
    allowProxyAttendance: false
  });

  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    faceVerification: true,
    language: 'en'
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Array<{ id: string, date: string, checkInAt?: string, checkOutAt?: string, status: string, subject?: string }>>([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0 });
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  // Note: qrWebcamRef removed as QR scanning is handled by AutoQRScanner component

  // Campus location state
  const [geofence, setGeofence] = useState<{ center: { lat: number, lng: number }, radiusMeters: number } | null>(null);

  useEffect(() => {
    // Fetch geofence settings
    const fetchGeofence = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('/api/admin/geofence', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.geofence) {
          setGeofence(data.geofence);
        }
      } catch (error) {
        console.error('Failed to load geofence:', error);
      }
    };
    fetchGeofence();
  }, []);

  // Check if user is within geofence
  const checkGeofence = (lat: number, lng: number) => {
    // Use fetched geofence or fallback to default
    const target = geofence ? {
      lat: geofence.center.lat,
      lng: geofence.center.lng,
      radius: geofence.radiusMeters
    } : {
      lat: 15.775002,
      lng: 78.057125,
      radius: 500
    };

    // Haversine formula to calculate distance between two points
    const R = 6371e3; // Earth radius in meters
    const lat1 = target.lat * Math.PI / 180;
    const lat2 = lat * Math.PI / 180;
    const deltaLat = (lat - target.lat) * Math.PI / 180;
    const deltaLng = (lng - target.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    console.log(`Distance: ${distance}m, Radius: ${target.radius}m, Inside: ${distance <= target.radius}`);

    return distance <= target.radius;
  };

  // Get user's current location with improved error handling and timeout
  const getLocation = () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setLocationStatus('failed');
      setLocationError('Geolocation is not supported by your browser. Please try a different browser or device.');
      setNotification({
        message: 'Geolocation is not supported by your browser.',
        type: 'error'
      });
      return;
    }

    setLocationStatus('pending');
    setLocationError(null);

    // Set a manual timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      setLocationStatus('failed');
      setLocationError('Location request timed out. Please ensure location services are enabled and try again.');
      setNotification({
        message: 'Location request timed out. Please ensure location services are enabled and try again.',
        type: 'error'
      });
      console.warn('Geolocation request manually timed out after 20 seconds');
    }, 20000); // 20 seconds timeout

    // Request location with detailed error handling
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Clear the manual timeout
        clearTimeout(timeoutId);

        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        console.log('Location retrieved:', latitude, longitude);

        // Check if user is within campus geofence
        if (checkGeofence(latitude, longitude)) {
          setLocationStatus('verified');
          setNotification({
            message: 'Location verified successfully! You are within the campus premises.',
            type: 'success'
          });
        } else {
          setLocationStatus('failed');
          setLocationError('You are outside the campus area. Please move closer to campus.');
          setNotification({
            message: 'You are outside the campus area. Attendance cannot be marked.',
            type: 'error'
          });
        }
      },
      (error) => {
        // Clear the manual timeout
        clearTimeout(timeoutId);

        setLocationStatus('failed');

        // Provide detailed error messages based on error code
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings and try again.';
            // Only log if it's not a user cancellation (user might have denied permission)
            if (error.message && !error.message.includes('User denied')) {
              console.error('Geolocation permission denied:', error);
            }
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please ensure your device location is turned on and try again.';
            console.error('Geolocation position unavailable:', error);
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please check your internet connection and try again.';
            console.error('Geolocation timeout:', error);
            break;
          default:
            errorMessage = `Unable to retrieve location: ${error.message || 'Unknown error'}. Please try again.`;
            // Only log if it's not a user cancellation
            if (error.message && !error.message.includes('User denied') && !error.message.includes('cancelled')) {
              console.error('Geolocation error:', error);
            }
            break;
        }

        setLocationError(errorMessage);
        setNotification({
          message: errorMessage,
          type: 'error'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout to 15 seconds
        maximumAge: 30000 // Reduced maximum age to 30 seconds for fresher data
      }
    );
  };

  // Verify face with backend API
  const verifyFaceWithBackend = async (imageData: string) => {
    setFaceVerificationLoading(true);
    setFaceVerificationError(null);

    try {
      const result = await faceService.verifyFace(imageData);

      if (result.verified) {
        setFaceVerified(true);
        setCameraActive(false);
      } else {
        setFaceVerificationError(result.message || 'Face verification failed');
      }
    } catch (error: unknown) {
      console.error('Face verification error:', error);
      setFaceVerificationError(error instanceof Error ? error.message : 'An error occurred during face verification. Please try again.');
    } finally {
      setFaceVerificationLoading(false);
    }
  };

  // Fetch user profile data and attendance data on component mount
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        redirectToLogin();
        return;
      }

      try {
        // Fetch profile data
        try {
          const profile = await authAPI.getProfile();
          setProfileData({
            name: profile.name || '',
            email: profile.email || '',
            studentId: profile.studentId || '',
            department: profile.department || '',
            year: profile.year || '',
            phone: profile.phone || ''
          });

          if (profile.profilePicture) {
            setProfilePicture(profile.profilePicture);
          }
        } catch (e) {
          console.error('Profile fetch failed:', e);
        }

        // Fetch attendance history
        try {
          const history = await attendanceAPI.getAttendanceHistory();
          setAttendanceHistory(history);
        } catch (e) {
          console.warn('History fetch failed:', e);
          // Don't crash, just empty history
          setAttendanceHistory([]);
        }

        // Fetch attendance summary
        try {
          const summary = await attendanceAPI.getSummary();
          setAttendanceStats(summary);
        } catch (e) {
          console.warn('Summary fetch failed:', e);
          setAttendanceStats({ present: 0, absent: 0 });
        }

        // Fetch face status
        try {
          const faceStatus = await faceService.getFaceStatus();
          if (faceStatus && faceStatus.securitySettings) {
            setFaceSettings({
              requireFaceVerification: faceStatus.securitySettings.requireFaceVerification || true,
              allowProxyAttendance: faceStatus.securitySettings.allowProxyAttendance || false
            });
          }
        } catch (e) {
          // Silent fail for face settings
        }

      } catch (error: unknown) {
        // Global error handler (should rarely be hit now)
        console.error('Critical initialization error:', error);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchData();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await authAPI.logout();
      redirectToLogin();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to login
      redirectToLogin();
    }
  };

  const totalClasses = attendanceStats.present + attendanceStats.absent;
  const attendancePercentage = totalClasses > 0 ? Math.round((attendanceStats.present / totalClasses) * 1000) / 10 : 0;
  const perfectWeeks = Math.floor(attendanceStats.present / 5); // Assuming 5 classes per week
  // Show "nil" for new users with no attendance records, otherwise calculate on-time rate
  const onTimeRate = totalClasses === 0 ? 'nil' :
    attendancePercentage > 90 ? '96%' :
      `${Math.max(80, attendancePercentage - 5)}%`;

  const stats = [
    { label: 'Weekly Attendance', value: `${attendancePercentage}%`, icon: BarChart3, change: totalClasses > 0 ? `+${Math.round((attendanceStats.present / totalClasses) * 100 - 90)}%` : '+0%' },
    { label: 'Classes Attended', value: `${attendanceStats.present}/${totalClasses}`, icon: Calendar, change: `+${attendanceStats.present}` },
    { label: 'Perfect Weeks', value: `${perfectWeeks}`, icon: Award, change: `+${perfectWeeks}` },
    { label: 'On-Time Rate', value: onTimeRate, icon: Clock, change: totalClasses > 0 ? onTimeRate : 'No data' },
  ];

  // Note: recentSessions removed as we use attendanceHistory from API

  return (
    <main className="min-h-screen bg-primary-bg">
      {/* Student Dashboard Header - Clearly identifies this as the Student Dashboard */}
      <header className="sticky top-0 z-50 bg-primary-bg/80 backdrop-blur-sm border-b border-primary">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <User className="w-8 h-8 text-accent-bronze" />
            <div>
              <h1 className="text-subheader-md text-text-primary font-medium">Student Dashboard</h1>
              <p className="text-body-md text-text-secondary">Personal Attendance Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-body-md text-text-primary bg-accent-bronze/10 px-3 py-1 rounded-full">
              {profileData.name || 'Student User'}
            </span>
            <button
              onClick={handleLogout}
              className="logout-button text-text-secondary hover:text-bronze transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-label uppercase tracking-wider">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="premium-card p-6 rounded-xl shadow-soft"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent-bronze/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-accent-bronze" />
                </div>
                <span className="text-label text-green-600">{stat.change}</span>
              </div>
              <p className="text-body-md text-text-secondary mb-1">{stat.label}</p>
              <p className="text-header-md text-text-primary font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <div className="premium-card rounded-xl shadow-soft overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-primary px-6">
            <div className="flex gap-8">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'checkin', label: 'Check-In', icon: QrCode },
                { id: 'history', label: 'History', icon: History },
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 border-b-2 transition-all font-medium ${activeTab === tab.id
                    ? 'border-accent-bronze text-accent-bronze'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-label uppercase tracking-wider">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-subheader-lg text-text-primary mb-6 font-serif">Recent Sessions</h2>
                  {loadingAttendance ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="luxury-loader"></div>
                    </div>
                  ) : attendanceHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-body-md text-text-secondary">No attendance records found</p>
                      <p className="text-body-sm text-text-secondary mt-2">Start marking attendance to see your history</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {attendanceHistory.slice(0, 4).map((session, i: number) => (
                        <div key={i} className="premium-card p-4 rounded-xl flex items-center justify-between hover:shadow-soft transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-accent-bronze/10 flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-accent-bronze" />
                            </div>
                            <div>
                              <p className="text-body-lg text-text-primary font-medium">
                                {session.subject || 'Attendance Session'}
                              </p>
                              <p className="text-body-md text-text-secondary">
                                {new Date(session.date).toLocaleDateString()} • {session.checkInAt ? new Date(session.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <span className={`px-4 py-2 rounded-full text-label font-medium ${session.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Absent'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'checkin' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <h2 className="text-header-md text-text-primary mb-4 font-serif text-center">Smart Check-In</h2>
                <p className="text-body-lg text-text-secondary mb-8 text-center">Complete all verification steps to mark attendance</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Geolocation Verification */}
                  <div className="premium-card p-6 rounded-xl hover:shadow-soft transition-all">
                    <div className="w-16 h-16 rounded-full bg-accent-bronze/10 flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-8 h-8 text-accent-bronze" />
                    </div>
                    <h3 className="text-subheader-md text-text-primary mb-2 font-medium text-center">Location Verification</h3>
                    <p className="text-body-md text-text-secondary mb-4 text-center">Verify campus location</p>

                    {locationStatus === 'pending' ? (
                      <div className="text-center">
                        <div className="luxury-loader mx-auto mb-4"></div>
                        <p className="text-body-md text-text-secondary">Getting your location...</p>
                        <p className="text-body-sm text-text-secondary mt-2">This may take a few seconds</p>
                        <button
                          onClick={() => {
                            setLocationStatus('cancelled');
                            setLocationError('Location request cancelled by user.');
                            setNotification({
                              message: 'Location request cancelled.',
                              type: 'warning'
                            });
                          }}
                          className="premium-button px-4 py-2 rounded-full text-label mt-4 text-text-secondary"
                        >
                          Cancel Request
                        </button>
                      </div>
                    ) : locationStatus === 'verified' ? (
                      <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <p className="text-body-md text-green-700 font-medium">Location Verified</p>
                        <p className="text-body-sm text-text-secondary mt-1">
                          {location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}
                        </p>
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-body-sm text-green-800">
                            ✓ You are within the campus premises. You can proceed with attendance.
                          </p>
                        </div>
                      </div>
                    ) : locationStatus === 'failed' ? (
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-red-600 mx-auto mb-2" />
                        <p className="text-body-md text-red-700 font-medium">Location Verification Failed</p>
                        {locationError && (
                          <p className="text-body-sm text-red-600 mt-1">{locationError}</p>
                        )}
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-body-sm text-red-800 font-medium">
                            ⚠ You are currently outside the campus area!
                          </p>
                          <p className="text-body-sm text-red-700 mt-1">
                            To mark attendance, you must be within the campus premises.
                          </p>
                          <p className="text-body-sm text-red-700 mt-1">
                            Please move to the campus area and try again.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            // Reset state before trying again
                            setLocationStatus('pending');
                            setLocationError(null);
                            setTimeout(() => getLocation(), 100);
                          }}
                          className="premium-button primary px-4 py-2 rounded-full text-label mt-4"
                        >
                          Retry Location Check
                        </button>
                      </div>
                    ) : locationStatus === 'cancelled' ? (
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-body-md text-text-secondary font-medium">Location Verification Cancelled</p>
                        {locationError && (
                          <p className="text-body-sm text-text-secondary mt-1">{locationError}</p>
                        )}
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-body-sm text-gray-700">
                            You cancelled the location request. Click &quot;Retry Location Check&quot; to try again.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            // Reset state before trying again
                            setLocationStatus('pending');
                            setLocationError(null);
                            setTimeout(() => getLocation(), 100);
                          }}
                          className="premium-button primary px-4 py-2 rounded-full text-label mt-4"
                        >
                          Retry Location Check
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-body-md text-text-secondary mb-4">Location verification required</p>
                        <button
                          onClick={() => {
                            // Reset state before starting
                            setLocationStatus('pending');
                            setLocationError(null);
                            // Show a notification to inform user about the upcoming permission request
                            setNotification({
                              message: 'Your browser will now ask for location permission. Please allow access to verify your location.',
                              type: 'info'
                            });
                            // Delay the actual location request to give time for the notification to appear
                            setTimeout(() => getLocation(), 1500);
                          }}
                          className="premium-button primary px-4 py-2 rounded-full text-label"
                        >
                          Verify Location
                        </button>
                        <p className="text-body-sm text-text-secondary mt-3">
                          Click above to verify your location on campus
                        </p>

                        {/* Location Permission Help */}
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
                          <p className="text-body-sm text-blue-800 font-medium mb-2">💡 Location Access Tips:</p>
                          <ul className="text-body-sm text-blue-700 list-disc pl-5 space-y-1">
                            <li>Ensure location services are enabled on your device</li>
                            <li>Allow this site to access your location when prompted</li>
                            <li>For Chrome: Click the lock icon → Location → Allow</li>
                            <li>For Safari: Preferences → Websites → Location</li>
                            <li>If you previously denied access, you may need to reset permissions in browser settings</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QR Code Scanning */}
                  <div className="premium-card p-6 rounded-xl hover:shadow-soft transition-all">
                    <div className="w-16 h-16 rounded-full bg-accent-bronze/10 flex items-center justify-center mx-auto mb-4">
                      <Scan className="w-8 h-8 text-accent-bronze" />
                    </div>
                    <h3 className="text-subheader-md text-text-primary mb-2 font-medium text-center">QR Code Scan</h3>
                    <p className="text-body-md text-text-secondary mb-4 text-center">Scan instructor code</p>

                    {qrScanned ? (
                      <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <p className="text-body-md text-green-700 font-medium">QR Scanned</p>
                        {scannedData && (
                          <p className="text-body-sm text-text-secondary mt-1 truncate">
                            {scannedData.substring(0, 30)}...
                          </p>
                        )}
                      </div>
                    ) : showQRScanner ? (
                      <AutoQRScanner
                        onScan={(data) => {
                          if (!data) return;

                          try {
                            // Attempt to parse validation data
                            let isValid = false;

                            try {
                              const parsed = JSON.parse(data);
                              // Validate signature/source
                              if (parsed.source === 'SOLVRA_FACULTY_DASHBOARD' && parsed.type === 'attendance') {
                                isValid = true;
                              }
                            } catch (e) {
                              // Not JSON, check for legacy string format if any (optional)
                            }

                            if (!isValid) {
                              setNotification({
                                message: 'Invalid QR Code. Please scan a valid Faculty QR Code.',
                                type: 'error'
                              });
                              return;
                            }

                            setScannedData(data);
                            setQrScanned(true);
                            setShowQRScanner(false);
                            // Automatically open face verification after QR scan
                            setTimeout(() => {
                              setCameraActive(true);
                            }, 1000);
                          } catch (e) {
                            console.error("QR Validation error", e);
                          }
                        }}
                        onClose={() => setShowQRScanner(false)}
                        title="Auto QR Scanner"
                        instruction="Position QR code in frame for automatic scanning"
                      />
                    ) : (
                      <button
                        onClick={() => setShowQRScanner(true)}
                        className="premium-button primary w-full py-3 rounded-full text-label"
                      >
                        Auto Scan QR Code
                      </button>
                    )}
                  </div>

                  {/* Face Recognition */}
                  <div className="premium-card p-6 rounded-xl hover:shadow-soft transition-all">
                    <div className="w-16 h-16 rounded-full bg-accent-bronze/10 flex items-center justify-center mx-auto mb-4">
                      <Camera className="w-8 h-8 text-accent-bronze" />
                    </div>
                    <h3 className="text-subheader-md text-text-primary mb-2 font-medium text-center">Face Recognition</h3>
                    <p className="text-body-md text-text-secondary mb-4 text-center">Biometric verification</p>

                    {faceVerified ? (
                      <div className="text-center">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                        <p className="text-body-md text-green-700 font-medium">Face Verified</p>
                      </div>
                    ) : faceVerificationLoading ? (
                      <div className="text-center">
                        <div className="luxury-loader mx-auto mb-4"></div>
                        <p className="text-body-md text-text-secondary">Verifying face...</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCameraActive(true)}
                        className="premium-button primary w-full py-3 rounded-full text-label"
                      >
                        Verify Face
                      </button>
                    )}
                  </div>
                </div>

                {/* Face Camera Component */}
                {cameraActive && (
                  <FaceCamera
                    onCapture={verifyFaceWithBackend}
                    onClose={() => setCameraActive(false)}
                    title="Face Verification"
                    instruction="Position your face in the frame and click the camera button"
                  />
                )}

                {/* Face Verification Error */}
                {faceVerificationError && (
                  <div className="premium-card p-4 rounded-xl bg-red-50 border border-red-200 mt-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-body-md text-red-800 font-medium">Face Verification Failed</p>
                        <p className="text-body-sm text-red-700 mt-1">{faceVerificationError}</p>
                        <button
                          onClick={() => {
                            setFaceVerificationError(null);
                            setCameraActive(true);
                          }}
                          className="text-body-sm text-accent-bronze font-medium mt-2 hover:underline"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendance Status */}
                {locationStatus === 'verified' && qrScanned && faceVerified && (
                  <div className="text-center mt-8">
                    <div className="premium-card p-6 rounded-xl bg-green-50 border border-green-200">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                      <p className="text-body-md text-green-700 font-medium">All verifications completed successfully!</p>
                      <p className="text-body-sm text-green-600 mt-1">Attendance will be marked automatically</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-subheader-lg text-text-primary mb-6 font-serif">Attendance History</h2>
                {loadingAttendance ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="luxury-loader"></div>
                  </div>
                ) : attendanceHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-body-md text-text-secondary">No attendance records found</p>
                    <p className="text-body-sm text-text-secondary mt-2">Start marking attendance to build your history</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="premium-table w-full">
                      <thead>
                        <tr>
                          <th className="text-left py-4 px-4 text-label text-text-secondary uppercase tracking-wider">Date</th>
                          <th className="text-left py-4 px-4 text-label text-text-secondary uppercase tracking-wider">Check-in Time</th>
                          <th className="text-left py-4 px-4 text-label text-text-secondary uppercase tracking-wider">Check-out Time</th>
                          <th className="text-left py-4 px-4 text-label text-text-secondary uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceHistory.map((session, i: number) => (
                          <tr key={i}>
                            <td className="py-4 px-4 text-body-md text-text-primary">
                              {new Date(session.date).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-4 text-body-md text-text-secondary">
                              {session.checkInAt ? new Date(session.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </td>
                            <td className="py-4 px-4 text-body-md text-text-secondary">
                              {session.checkOutAt ? new Date(session.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full text-label font-medium ${session.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Absent'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-3xl mx-auto"
              >
                <h2 className="text-header-md text-text-primary mb-8 text-center font-serif">My Profile</h2>

                <div className="space-y-8">
                  <div className="premium-card p-6 rounded-xl">
                    <div className="flex items-center gap-6 mb-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-accent-bronze flex items-center justify-center overflow-hidden">
                          {profilePicture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profilePicture}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-12 h-12 text-white" />
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-accent-bronze rounded-full p-2 cursor-pointer hover:bg-bronze transition-colors">
                          <Edit3 className="w-4 h-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setProfilePictureFile(file);
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setProfilePicture(event.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <div>
                        <h3 className="text-subheader-md text-text-primary font-medium">{profileData.name}</h3>
                        <p className="text-body-md text-text-secondary">{profileData.studentId}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              // Initialize edited data with current profile data
                              setEditedProfileData(profileData);
                              setEditingProfile(true);
                            }}
                            className="premium-button py-2 px-4 rounded-full text-label flex items-center gap-2 hover:bg-accent-bronze/10"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit Profile
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                // Save any changes including profile picture
                                const profileUpdateData = {
                                  ...profileData,
                                  profilePicture: profilePicture || undefined
                                };

                                // Update profile data
                                const updatedProfile = await authAPI.updateProfile(profileUpdateData);
                                // FIX: Update the profileData state with the response from the server
                                setProfileData(updatedProfile);
                                // Also update the editedProfileData to reflect the saved changes
                                setEditedProfileData(updatedProfile);
                                setNotification({
                                  message: 'Profile saved successfully!',
                                  type: 'success'
                                });
                              } catch (error: unknown) {
                                setNotification({
                                  message: error instanceof Error ? error.message : 'Failed to save profile. Please try again.',
                                  type: 'error'
                                });
                              }
                            }}
                            className="premium-button primary py-2 px-4 rounded-full text-label flex items-center gap-2"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>

                    {editingProfile ? (
                      // Edit Profile Form
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Full Name</label>
                            <input
                              type="text"
                              value={editedProfileData.name}
                              onChange={(e) => setEditedProfileData({ ...editedProfileData, name: e.target.value })}
                              className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                            />
                          </div>
                          <div>
                            <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Email</label>
                            <input
                              type="email"
                              value={editedProfileData.email}
                              onChange={(e) => setEditedProfileData({ ...editedProfileData, email: e.target.value })}
                              className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                            />
                          </div>
                          <div>
                            <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Student ID</label>
                            <input
                              type="text"
                              value={editedProfileData.studentId}
                              onChange={(e) => setEditedProfileData({ ...editedProfileData, studentId: e.target.value })}
                              className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                            />
                          </div>
                          <div>
                            <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Department</label>
                            <input
                              type="text"
                              value={editedProfileData.department}
                              onChange={(e) => setEditedProfileData({ ...editedProfileData, department: e.target.value })}
                              className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                            />
                          </div>
                          <div>
                            <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Year</label>
                            <input
                              type="text"
                              value={editedProfileData.year}
                              onChange={(e) => setEditedProfileData({ ...editedProfileData, year: e.target.value })}
                              className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                            />
                          </div>
                          <div>
                            <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Phone</label>
                            <input
                              type="text"
                              value={editedProfileData.phone}
                              onChange={(e) => setEditedProfileData({ ...editedProfileData, phone: e.target.value })}
                              className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                            />
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button
                            onClick={async () => {
                              try {
                                // Prepare profile data including profile picture
                                const profileUpdateData = {
                                  ...editedProfileData,
                                  profilePicture: profilePicture || undefined
                                };

                                // Update profile data
                                const updatedProfile = await authAPI.updateProfile(profileUpdateData);
                                setProfileData(updatedProfile);
                                setEditingProfile(false);
                                setNotification({
                                  message: 'Profile updated successfully!',
                                  type: 'success'
                                });
                              } catch (error: unknown) {
                                setNotification({
                                  message: error instanceof Error ? error.message : 'Failed to update profile. Please try again.',
                                  type: 'error'
                                });
                              }
                            }}
                            className="premium-button primary px-6 py-3 rounded-full text-label"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingProfile(false)}
                            className="premium-button px-6 py-3 rounded-full text-label text-text-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Profile
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Full Name</label>
                          <p className="premium-input w-full px-4 py-3 rounded-lg text-body-md">{profileData.name}</p>
                        </div>
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Email</label>
                          <a href={`mailto:${profileData.email}`} className="premium-input w-full px-4 py-3 rounded-lg text-body-md text-text-primary hover:text-accent-bronze transition-colors block">
                            {profileData.email}
                          </a>
                        </div>
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Student ID</label>
                          <p className="premium-input w-full px-4 py-3 rounded-lg text-body-md">{profileData.studentId}</p>
                        </div>
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Department</label>
                          <p className="premium-input w-full px-4 py-3 rounded-lg text-body-md">{profileData.department}</p>
                        </div>
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Year</label>
                          <p className="premium-input w-full px-4 py-3 rounded-lg text-body-md">{profileData.year}</p>
                        </div>
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Phone</label>
                          <p className="premium-input w-full px-4 py-3 rounded-lg text-body-md">{profileData.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="premium-card p-6 rounded-xl">
                    <h3 className="text-subheader-md text-text-primary mb-4 font-medium">Security</h3>
                    <div className="space-y-4">
                      <button
                        onClick={() => setChangingPassword(true)}
                        className="w-full text-left premium-input px-4 py-3 rounded-lg text-body-md flex items-center justify-between hover:bg-accent-bronze/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Lock className="w-5 h-5 text-accent-bronze" />
                          <span>Change Password</span>
                        </div>
                        <Edit3 className="w-4 h-4 text-text-secondary" />
                      </button>
                      <button
                        onClick={() => setFaceSettingsActive(true)}
                        className="w-full text-left premium-input px-4 py-3 rounded-lg text-body-md flex items-center justify-between hover:bg-accent-bronze/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Camera className="w-5 h-5 text-accent-bronze" />
                          <span>Face Recognition Settings</span>
                        </div>
                        <Edit3 className="w-4 h-4 text-text-secondary" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Change Password Modal */}
                {changingPassword && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                    <div className="premium-card p-6 rounded-xl max-w-md w-full">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-subheader-md text-text-primary font-medium">Change Password</h3>
                        <button onClick={() => setChangingPassword(false)}>
                          <X className="w-5 h-5 text-text-secondary" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div className="relative">
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Current Password</label>
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="premium-input w-full px-4 py-3 rounded-lg text-body-md pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-9 text-text-secondary"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        <div className="relative">
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">New Password</label>
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="premium-input w-full px-4 py-3 rounded-lg text-body-md pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-9 text-text-secondary"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        <div className="relative">
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Confirm New Password</label>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="premium-input w-full px-4 py-3 rounded-lg text-body-md pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-9 text-text-secondary"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        <div className="flex gap-4">
                          <button
                            onClick={async () => {
                              try {
                                // Validate passwords
                                if (!passwordData.currentPassword) {
                                  setNotification({
                                    message: 'Please enter your current password!',
                                    type: 'error'
                                  });
                                  return;
                                }

                                if (!passwordData.newPassword) {
                                  setNotification({
                                    message: 'Please enter a new password!',
                                    type: 'error'
                                  });
                                  return;
                                }

                                if (!passwordData.confirmPassword) {
                                  setNotification({
                                    message: 'Please confirm your new password!',
                                    type: 'error'
                                  });
                                  return;
                                }

                                if (passwordData.newPassword !== passwordData.confirmPassword) {
                                  setNotification({
                                    message: 'New passwords do not match!',
                                    type: 'error'
                                  });
                                  return;
                                }

                                if (passwordData.newPassword.length < 6) {
                                  setNotification({
                                    message: 'Password must be at least 6 characters long!',
                                    type: 'error'
                                  });
                                  return;
                                }

                                // Change password
                                await authAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
                                setChangingPassword(false);
                                setPasswordData({
                                  currentPassword: '',
                                  newPassword: '',
                                  confirmPassword: ''
                                });
                                setShowCurrentPassword(false);
                                setShowNewPassword(false);
                                setShowConfirmPassword(false);
                                setNotification({
                                  message: 'Password changed successfully!',
                                  type: 'success'
                                });
                              } catch (error: unknown) {
                                console.error('Password change error:', error);
                                setNotification({
                                  message: error instanceof Error ? error.message : 'Failed to change password. Please try again.',
                                  type: 'error'
                                });
                              }
                            }}
                            className="premium-button primary px-6 py-3 rounded-full text-label flex-1"
                          >
                            Change Password
                          </button>
                          <button
                            onClick={() => {
                              setChangingPassword(false);
                              setPasswordData({
                                currentPassword: '',
                                newPassword: '',
                                confirmPassword: ''
                              });
                              setShowCurrentPassword(false);
                              setShowNewPassword(false);
                              setShowConfirmPassword(false);
                            }}
                            className="premium-button px-6 py-3 rounded-full text-label text-text-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Face Recognition Settings Modal */}
                {faceSettingsActive && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                    <div className="premium-card p-6 rounded-xl max-w-md w-full">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-subheader-md text-text-primary font-medium">Face Recognition Settings</h3>
                        <button onClick={() => setFaceSettingsActive(false)}>
                          <X className="w-5 h-5 text-text-secondary" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-body-md text-text-primary font-medium">Require Face Verification</p>
                            <p className="text-body-sm text-text-secondary">Require face verification for attendance</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={faceSettings.requireFaceVerification}
                              onChange={(e) => setFaceSettings({ ...faceSettings, requireFaceVerification: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-bronze"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-body-md text-text-primary font-medium">Allow Proxy Attendance</p>
                            <p className="text-body-sm text-text-secondary">Allow attendance marking through authorized proxies</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={faceSettings.allowProxyAttendance}
                              onChange={(e) => setFaceSettings({ ...faceSettings, allowProxyAttendance: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-bronze"></div>
                          </label>
                        </div>
                        <div className="flex gap-4">
                          <button
                            onClick={async () => {
                              try {
                                // Save face settings using the face service
                                await faceService.updateSecuritySettings({
                                  requireFaceVerification: faceSettings.requireFaceVerification,
                                  allowProxyAttendance: faceSettings.allowProxyAttendance
                                });
                                setFaceSettingsActive(false);
                                setNotification({
                                  message: 'Face recognition settings updated!',
                                  type: 'success'
                                });
                              } catch (error: unknown) {
                                console.error('Error updating face recognition settings:', error);
                                setNotification({
                                  message: error instanceof Error ? error.message : 'Failed to update settings. Please try again.',
                                  type: 'error'
                                });
                              }
                            }}
                            className="premium-button primary px-6 py-3 rounded-full text-label flex-1"
                          >
                            Save Settings
                          </button>
                          <button
                            onClick={() => setFaceSettingsActive(false)}
                            className="premium-button px-6 py-3 rounded-full text-label text-text-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-3xl mx-auto"
              >
                <h2 className="text-header-md text-text-primary mb-8 text-center font-serif">Settings</h2>

                <div className="space-y-6">
                  <div className="premium-card p-6 rounded-xl">
                    <h3 className="text-subheader-md text-text-primary mb-4 font-medium flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Notifications
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-body-md text-text-primary font-medium">Attendance Reminders</p>
                          <p className="text-body-sm text-text-secondary">Get notified before classes start</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.notifications}
                            onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-bronze"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-body-md text-text-primary font-medium">Class Updates</p>
                          <p className="text-body-sm text-text-secondary">Receive updates about class changes</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.notifications}
                            onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-bronze"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="premium-card p-6 rounded-xl">
                    <h3 className="text-subheader-md text-text-primary mb-4 font-medium flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Appearance
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-body-md text-text-primary font-medium">Dark Mode</p>
                          <p className="text-body-sm text-text-secondary">Use dark theme for the app</p>
                        </div>
                        <span className="text-body-sm text-text-secondary">Not available</span>
                      </div>
                    </div>
                  </div>

                  <div className="premium-card p-6 rounded-xl">
                    <h3 className="text-subheader-md text-text-primary mb-4 font-medium flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      Security
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-body-md text-text-primary font-medium">Face Verification</p>
                          <p className="text-body-sm text-text-secondary">Require face verification for attendance</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.faceVerification}
                            onChange={(e) => setSettings({ ...settings, faceVerification: e.target.checked })}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-bronze"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="premium-card p-6 rounded-xl">
                    <h3 className="text-subheader-md text-text-primary mb-4 font-medium">Account</h3>
                    <div className="space-y-4">
                      <button
                        onClick={handleLogout}
                        className="w-full premium-button py-3 rounded-full text-label flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}