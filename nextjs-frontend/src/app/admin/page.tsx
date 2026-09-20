'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Camera, Settings, BarChart3, Shield, TrendingUp, UserPlus, Search, MapPin, LogOut, Plus, X, Edit3, QrCode, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Webcam from 'react-webcam';
import { authAPI, redirectToLogin } from '@/services/api';

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [geofenceSettings, setGeofenceSettings] = useState({
    lat: 15.775002, // Default fallback
    lng: 78.057125,
    radius: 500
  });
  const [testResult, setTestResult] = useState<{ inside: boolean, distance: number } | null>(null);
  const [testingLocation, setTestingLocation] = useState(false);
  const [savingGeofence, setSavingGeofence] = useState(false);
  const [geoMessage, setGeoMessage] = useState({ type: '', text: '' });
  const [profileData, setProfileData] = useState({
    name: '',
    role: ''
  });
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    employeeId: '',
    department: '',
    role: 'student'
  });
  const [users, setUsers] = useState<Array<{ id: number, name: string, email: string, role: string, status: string }>>([]);
  const [loadingData, setLoadingData] = useState(true);
  const webcamRef = useRef<Webcam>(null);

  // Fetch user profile data and other data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile data
        const profile = await authAPI.getProfile();
        setProfileData({
          name: profile.name || '',
          role: profile.role || ''
        });

        // Fetch geofence data
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const geoRes = await fetch('/api/admin/geofence', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const geoData = await geoRes.json();
            if (geoData.success && geoData.geofence) {
              setGeofenceSettings({
                lat: geoData.geofence.center?.lat || 15.775002,
                lng: geoData.geofence.center?.lng || 78.057125,
                radius: geoData.geofence.radiusMeters || 500
              });
            }
          } catch (e) {
            console.error('Failed to fetch geofence:', e);
          }
        }

        // For now, we'll use mock users data
        const mockUsers = [
          { id: 1, name: 'John Doe', email: 'john@university.edu', role: 'Student', status: 'Active' },
          { id: 2, name: 'Jane Smith', email: 'jane@university.edu', role: 'Student', status: 'Active' },
          { id: 3, name: 'Prof. Williams', email: 'williams@university.edu', role: 'Faculty', status: 'Active' },
          { id: 4, name: 'Dr. Johnson', email: 'johnson@university.edu', role: 'Faculty', status: 'Active' },
        ];
        setUsers(mockUsers);
      } catch (error: unknown) {
        console.error('Failed to fetch data:', error);
        // Fallback mock data
        const mockUsers = [
          { id: 1, name: 'John Doe', email: 'john@university.edu', role: 'Student', status: 'Active' },
          { id: 2, name: 'Jane Smith', email: 'jane@university.edu', role: 'Student', status: 'Active' },
        ];
        setUsers(mockUsers);
      } finally {
        setLoadingData(false);
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

  // Format role for display
  const formatRole = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'faculty':
        return 'Faculty';
      case 'student':
        return 'Student';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const totalUsers = users.length;
  const activeSessions = 23; // This would come from an API in a real implementation
  const avgAttendance = 87.3; // This would come from an API in a real implementation
  const faceRegistered = 892; // This would come from an API in a real implementation

  const stats = [
    { label: 'Total Users', value: `${totalUsers}`, change: '+12%', icon: Users },
    { label: 'Active Sessions', value: `${activeSessions}`, change: '+5%', icon: Shield },
    { label: 'Avg Attendance', value: `${avgAttendance}%`, change: '+3.2%', icon: TrendingUp },
    { label: 'Face Registered', value: `${faceRegistered}`, change: '+8%', icon: Camera },
  ];

  // Handle geofence settings change
  const handleGeofenceChange = (field: string, value: string) => {
    setGeofenceSettings({
      ...geofenceSettings,
      [field]: field === 'radius' ? parseInt(value) : value
    });
  };

  // Save geofence settings
  const saveGeofenceSettings = async () => {
    setSavingGeofence(true);
    setGeoMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/geofence', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          center: { lat: parseFloat(String(geofenceSettings.lat)), lng: parseFloat(String(geofenceSettings.lng)) },
          radiusMeters: parseInt(String(geofenceSettings.radius))
        })
      });
      const data = await response.json();
      if (response.ok) {
        setGeoMessage({ type: 'success', text: 'Geofence settings updated successfully!' });
      } else {
        throw new Error(data.msg || 'Failed to update');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error saving settings';
      setGeoMessage({ type: 'error', text: errorMessage });
    } finally {
      setSavingGeofence(false);
      setTimeout(() => setGeoMessage({ type: '', text: '' }), 3000);
    }
  };

  // Test current location
  const testCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setTestingLocation(true);
    setTestResult(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/admin/geofence/test', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          });
          const data = await response.json();
          if (data.success) {
            setTestResult({
              inside: data.inside,
              distance: data.distance
            });
          } else {
            alert('Test failed: ' + (data.msg || 'Unknown error'));
          }
        } catch (error) {
          console.error('Test error:', error);
          alert('Error testing location');
        } finally {
          setTestingLocation(false);
        }
      },
      (error) => {
        setTestingLocation(false);
        alert('Error getting location: ' + error.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Set center to current location
  const setCenterToCurrent = () => {
    setSavingGeofence(true); // Reusing loading state for feedback
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeofenceSettings(prev => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }));
        setSavingGeofence(false);
      },
      (err) => {
        setSavingGeofence(false);
        alert('Location error: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Capture face image for registration
  const captureFaceImage = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        // In a real app, this would send the image to backend for storage
        console.log('Captured face image for registration:', imageSrc);
        alert('Face data captured successfully!');
      }
    }
  };

  return (
    <main className="min-h-screen bg-primary-bg">
      {/* Admin Portal Header - Clearly identifies this as the Admin Portal */}
      <header className="sticky top-0 z-50 bg-primary-bg/80 backdrop-blur-sm border-b border-primary">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="w-8 h-8 text-accent-bronze" />
            <div>
              <h1 className="text-subheader-md text-text-primary font-medium">Admin Portal</h1>
              <p className="text-body-md text-text-secondary">System Administration Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-body-md text-text-primary bg-accent-bronze/10 px-3 py-1 rounded-full">
              {profileData.name || 'Admin User'} ({formatRole(profileData.role || 'Administrator')})
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
        {/* Admin Portal Stats - Clearly shows administrative metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="premium-card p-6 rounded-xl shadow-soft border-l-4 border-accent-bronze"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent-bronze/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-accent-bronze" />
                </div>
                <span className="text-label text-green-600">{stat.change}</span>
              </div>
              <p className="text-body-md text-text-secondary mb-1 uppercase tracking-wider">{stat.label}</p>
              <p className="text-header-md text-text-primary font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Admin Portal Navigation - Clearly labeled administrative functions */}
        <div className="premium-card rounded-xl shadow-soft overflow-hidden">
          <div className="border-b border-primary px-6 bg-accent-bronze/5">
            <div className="flex gap-8">
              {[
                { id: 'analytics', label: 'System Analytics', icon: BarChart3 },
                { id: 'users', label: 'User Management', icon: Users },
                { id: 'faces', label: 'Face Data', icon: Camera },
                { id: 'settings', label: 'System Settings', icon: Settings },
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

          <div className="p-8">
            {/* Analytics Tab - System-wide analytics */}
            {activeTab === 'analytics' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-subheader-lg text-text-primary font-serif">System Analytics Dashboard</h2>
                  <span className="text-body-md text-text-secondary bg-accent-bronze/10 px-3 py-1 rounded-full">
                    Administrative View
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="chart-container h-80 flex items-center justify-center rounded-xl bg-accent-bronze/5 border border-primary">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-accent-bronze mx-auto mb-4" />
                      <p className="text-text-secondary text-body-md">Attendance Trend Analytics</p>
                      <p className="text-text-primary text-body-lg mt-2">System-wide attendance patterns</p>
                    </div>
                  </div>
                  <div className="chart-container h-80 flex items-center justify-center rounded-xl bg-accent-bronze/5 border border-primary">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 text-accent-bronze mx-auto mb-4" />
                      <p className="text-text-secondary text-body-md">Department Performance</p>
                      <p className="text-text-primary text-body-lg mt-2">Cross-department analytics</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Users Tab - User management */}
            {activeTab === 'users' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-subheader-lg text-text-primary font-serif">User Management System</h2>
                  <button
                    onClick={() => {
                      // Reset form data
                      setRegistrationData({
                        name: '',
                        email: '',
                        password: '',
                        studentId: '',
                        employeeId: '',
                        department: '',
                        role: 'student'
                      });
                      setShowRegistrationModal(true);
                    }}
                    className="premium-button primary px-6 py-3 rounded-full text-label uppercase tracking-wider flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Register New User
                  </button>
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Search users by name, email, or role..."
                      className="premium-input w-full pl-12 pr-4 py-3 rounded-full text-body-md"
                    />
                  </div>
                </div>

                {loadingData ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="luxury-loader"></div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-body-md text-text-secondary">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {users.map((user) => (
                        <div key={user.id} className="premium-card p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between hover:shadow-soft transition-all border-l-4 border-accent-bronze">
                          <div className="flex items-center gap-4 mb-4 md:mb-0">
                            <div className="w-12 h-12 rounded-full bg-accent-bronze flex items-center justify-center">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="text-body-lg text-text-primary font-medium">{user.name}</p>
                              <p className="text-body-md text-text-secondary">{user.email}</p>
                              <span className="inline-block mt-1 px-2 py-1 rounded-full bg-primary-card text-label uppercase tracking-wider">
                                {user.role}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="px-4 py-2 rounded-full bg-green-100 text-green-800 text-label font-medium">Active</span>
                            <button className="text-text-secondary hover:text-bronze transition-colors p-2">
                              <Settings className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Faces Tab - Face data management */}
            {activeTab === 'faces' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-subheader-lg text-text-primary mb-2 font-serif">Face Data Management</h2>
                    <p className="text-body-md text-text-secondary">Manage biometric face registration for all users</p>
                  </div>
                  <button
                    onClick={() => setShowFaceRegistration(true)}
                    className="premium-button primary px-6 py-3 rounded-full text-label uppercase tracking-wider flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Register New Face
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="premium-card p-6 rounded-xl text-center hover:shadow-soft transition-all border border-primary">
                      <div className="w-24 h-24 rounded-full bg-accent-bronze/10 mx-auto mb-4 flex items-center justify-center">
                        <Camera className="w-10 h-10 text-accent-bronze" />
                      </div>
                      <p className="text-body-lg text-text-primary font-medium mb-1">Student {item}</p>
                      <p className="text-body-md text-text-secondary mb-2">STU202400{item}</p>
                      <p className="text-body-sm text-text-secondary mb-4">Computer Science</p>
                      <div className="flex justify-between items-center">
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-label font-medium">Registered</span>
                        <div className="flex gap-2">
                          <button className="text-text-secondary hover:text-bronze transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="text-text-secondary hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Face Registration Modal */}
                {showFaceRegistration && (
                  <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={(e) => {
                      // Close modal when clicking on backdrop
                      if (e.target === e.currentTarget) {
                        setShowFaceRegistration(false);
                      }
                    }}
                  >
                    <div className="premium-card p-6 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-subheader-md text-text-primary font-medium">Register Student Face</h3>
                        <button
                          onClick={() => setShowFaceRegistration(false)}
                          className="text-text-secondary hover:text-bronze"
                          aria-label="Close"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-label text-text-secondary mb-2">Student ID</label>
                          <input
                            type="text"
                            placeholder="Enter student ID"
                            className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                          />
                        </div>

                        <div>
                          <label className="block text-label text-text-secondary mb-2">Student Name</label>
                          <input
                            type="text"
                            placeholder="Enter student name"
                            className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                          />
                        </div>

                        <div className="text-center">
                          <div className="bg-gray-200 rounded-lg h-48 flex items-center justify-center mb-4 relative overflow-hidden">
                            <Webcam
                              audio={false}
                              ref={webcamRef}
                              screenshotFormat="image/jpeg"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 border-4 border-accent-bronze rounded-lg pointer-events-none"></div>
                          </div>
                          <button
                            onClick={captureFaceImage}
                            className="premium-button primary px-6 py-3 rounded-full text-label flex items-center gap-2 mx-auto"
                          >
                            <Camera className="w-5 h-5" />
                            Capture Face
                          </button>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowFaceRegistration(false)}
                            className="premium-button w-full py-3 rounded-full text-label border border-primary"
                          >
                            Cancel
                          </button>
                          <button className="premium-button primary w-full py-3 rounded-full text-label">
                            Save Face Data
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Settings Tab - System configuration */}
            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-subheader-lg text-text-primary mb-2 font-serif">System Configuration</h2>
                    <p className="text-body-md text-text-secondary">Manage global system settings and policies</p>
                  </div>
                  <span className="text-body-md text-text-primary bg-accent-bronze/10 px-3 py-1 rounded-full">
                    Admin Only
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Geofencing Settings */}
                  <div className="premium-card p-6 rounded-xl shadow-soft border border-primary">
                    <div className="flex items-center gap-3 mb-6">
                      <MapPin className="w-6 h-6 text-accent-bronze" />
                      <h3 className="text-subheader-md text-text-primary font-medium">Geofencing Configuration</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Campus Latitude</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={geofenceSettings.lat}
                          onChange={(e) => handleGeofenceChange('lat', e.target.value)}
                          className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                        />
                      </div>
                      <div>
                        <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Campus Longitude</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={geofenceSettings.lng}
                          onChange={(e) => handleGeofenceChange('lng', e.target.value)}
                          className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                        />
                      </div>
                      <div>
                        <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Radius (meters)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={geofenceSettings.radius}
                          onChange={(e) => handleGeofenceChange('radius', e.target.value)}
                          className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                        />
                      </div>

                      {geoMessage.text && (
                        <div className={`p-3 rounded-lg text-sm ${geoMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {geoMessage.text}
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={setCenterToCurrent}
                          disabled={savingGeofence}
                          className="premium-button bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-full text-label uppercase tracking-wider flex-1 flex items-center justify-center gap-2"
                        >
                          <MapPin className="w-4 h-4" /> Use My Location
                        </button>
                        <button
                          onClick={saveGeofenceSettings}
                          disabled={savingGeofence}
                          className="premium-button primary px-6 py-3 rounded-full text-label uppercase tracking-wider flex-1 flex items-center justify-center gap-2"
                        >
                          {savingGeofence ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save Settings'}
                        </button>
                      </div>

                      {/* Test Location Section */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-body-md font-medium text-text-primary mb-3">Test Location Verification</h4>
                        <button
                          onClick={testCurrentLocation}
                          disabled={testingLocation}
                          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-3 rounded-lg text-label uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                        >
                          {testingLocation ? <Loader2 className="animate-spin w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          Check If I&apos;m Inside
                        </button>

                        {testResult && (
                          <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${testResult.inside ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            {testResult.inside ? (
                              <CheckCircle className="w-8 h-8 text-green-600" />
                            ) : (
                              <XCircle className="w-8 h-8 text-red-600" />
                            )}
                            <div>
                              <p className={`font-bold ${testResult.inside ? 'text-green-800' : 'text-red-800'}`}>
                                {testResult.inside ? 'You are Inside Campus' : 'You are Outside Campus'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Distance from center: <strong>{Math.round(testResult.distance)} meters</strong>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Security Settings */}
                  <div className="premium-card p-6 rounded-xl shadow-soft border border-primary">
                    <div className="flex items-center gap-3 mb-6">
                      <Shield className="w-6 h-6 text-accent-bronze" />
                      <h3 className="text-subheader-md text-text-primary font-medium">Security Policies</h3>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: 'Face Verification Required', enabled: true, description: 'Mandatory biometric verification for all check-ins' },
                        { label: 'Geofencing Enabled', enabled: true, description: 'Location-based attendance validation' },
                        { label: 'Email Notifications', enabled: false, description: 'System alerts and reports via email' },
                        { label: 'Proxy Attendance Allowed', enabled: false, description: 'Permit authorized users to check-in for others' },
                      ].map((setting, i) => (
                        <div key={i} className="border-b border-primary pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-body-md text-text-primary font-medium">{setting.label}</span>
                            <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${setting.enabled ? 'bg-accent-bronze' : 'bg-primary-card border border-primary'
                              }`}>
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${setting.enabled ? 'right-1' : 'left-1'
                                }`} />
                            </div>
                          </div>
                          <p className="text-body-sm text-text-secondary">{setting.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* QR Code Settings */}
                  <div className="premium-card p-6 rounded-xl shadow-soft border border-primary lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                      <QrCode className="w-6 h-6 text-accent-bronze" />
                      <h3 className="text-subheader-md text-text-primary font-medium">QR Code Configuration</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Expiration Time (minutes)</label>
                        <input
                          type="number"
                          defaultValue="15"
                          className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                        />
                      </div>
                      <div>
                        <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Refresh Interval (seconds)</label>
                        <input
                          type="number"
                          defaultValue="30"
                          className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                        />
                      </div>
                      <div>
                        <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Security Level</label>
                        <select className="premium-input w-full px-4 py-3 rounded-lg text-body-md">
                          <option>Standard</option>
                          <option>Enhanced</option>
                          <option>Maximum</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              setShowRegistrationModal(false);
            }
          }}
        >
          <div className="premium-card p-6 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-subheader-md text-text-primary font-medium">Register New User</h3>
              <button
                onClick={() => setShowRegistrationModal(false)}
                className="text-text-secondary hover:text-bronze"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-label text-text-secondary mb-2">User Role</label>
                <select
                  value={registrationData.role}
                  onChange={(e) => setRegistrationData({ ...registrationData, role: e.target.value })}
                  className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="hod">Head of Department (Admin)</option>
                  <option value="dean">Dean (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-label text-text-secondary mb-2">Full Name</label>
                <input
                  type="text"
                  value={registrationData.name}
                  onChange={(e) => setRegistrationData({ ...registrationData, name: e.target.value })}
                  placeholder="Enter full name"
                  className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                />
              </div>

              <div>
                <label className="block text-label text-text-secondary mb-2">Email</label>
                <input
                  type="email"
                  value={registrationData.email}
                  onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
                  placeholder="Enter email address"
                  className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                />
              </div>

              <div>
                <label className="block text-label text-text-secondary mb-2">Password</label>
                <input
                  type="password"
                  value={registrationData.password}
                  onChange={(e) => setRegistrationData({ ...registrationData, password: e.target.value })}
                  placeholder="Enter password"
                  className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                />
              </div>

              {registrationData.role === 'student' && (
                <div>
                  <label className="block text-label text-text-secondary mb-2">Student ID</label>
                  <input
                    type="text"
                    value={registrationData.studentId}
                    onChange={(e) => setRegistrationData({ ...registrationData, studentId: e.target.value })}
                    placeholder="Enter student ID"
                    className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                  />
                </div>
              )}

              {(registrationData.role === 'faculty' || registrationData.role === 'hod' || registrationData.role === 'dean') && (
                <>
                  <div>
                    <label className="block text-label text-text-secondary mb-2">
                      {registrationData.role === 'faculty' ? 'Employee ID' :
                        registrationData.role === 'hod' ? 'HOD ID' : 'Dean ID'}
                    </label>
                    <input
                      type="text"
                      value={registrationData.employeeId}
                      onChange={(e) => setRegistrationData({ ...registrationData, employeeId: e.target.value })}
                      placeholder={`Enter ${registrationData.role === 'faculty' ? 'employee' :
                        registrationData.role === 'hod' ? 'HOD' : 'Dean'} ID`}
                      className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                    />
                  </div>

                  <div>
                    <label className="block text-label text-text-secondary mb-2">Department</label>
                    <input
                      type="text"
                      value={registrationData.department}
                      onChange={(e) => setRegistrationData({ ...registrationData, department: e.target.value })}
                      placeholder="Enter department"
                      className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRegistrationModal(false)}
                  className="premium-button w-full py-3 rounded-full text-label border border-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Validate required fields
                      if (!registrationData.name || !registrationData.email || !registrationData.password) {
                        alert('Please fill in all required fields');
                        return;
                      }

                      if (registrationData.role === 'student' && !registrationData.studentId) {
                        alert('Please enter Student ID');
                        return;
                      }

                      if ((registrationData.role === 'faculty' || registrationData.role === 'hod' || registrationData.role === 'dean') &&
                        (!registrationData.employeeId || !registrationData.department)) {
                        alert('Please enter both Employee ID and Department');
                        return;
                      }

                      if (registrationData.role === 'student') {
                        await authAPI.registerStudent({
                          name: registrationData.name,
                          email: registrationData.email,
                          password: registrationData.password,
                          studentId: registrationData.studentId
                        });
                      } else {
                        await authAPI.registerFaculty({
                          name: registrationData.name,
                          email: registrationData.email,
                          password: registrationData.password,
                          employeeId: registrationData.employeeId,
                          department: registrationData.department
                        });
                      }

                      // Close modal and show success message
                      setShowRegistrationModal(false);
                      alert('User registered successfully!');

                      // In a real app, you would refresh the user list here
                    } catch (error: unknown) {
                      alert(error instanceof Error ? error.message : 'Registration failed');
                    }
                  }}
                  className="premium-button primary w-full py-3 rounded-full text-label"
                >
                  Register User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}