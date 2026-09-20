'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, BarChart3, Users, Clock, Download, Plus, LogOut, MapPin, Camera, CheckCircle, AlertCircle, User, Edit3, Lock, X, Eye, EyeOff, GraduationCap } from 'lucide-react';
import QRCode from 'qrcode';
import FaceCamera from '@/components/FaceCamera';
// import Notification from '@/components/Notification';
import ProxyAttendance from '@/components/ProxyAttendance';
import { faceService } from '@/services/faceService';
import { authAPI, facultyAttendanceAPI, redirectToLogin } from '@/services/api';

export default function FacultyPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrData, setQrData] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceRegistrationSuccess, setFaceRegistrationSuccess] = useState(false);
  const [faceRegistrationError, setFaceRegistrationError] = useState<string | null>(null);
  // Note: faceRegistrationLoading removed as it's not used in this component
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [profileData, setProfileData] = useState({
    name: '',
    department: ''
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
    employeeId: '',
    department: ''
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

  const [students, setStudents] = useState<Array<{ id: string, name: string, email: string, studentId: string }>>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [facultyOverview, setFacultyOverview] = useState<Array<{ id: string, status: string, checkInAt?: string, user?: { name: string, studentId: string } }>>([]);
  const [currentSession, setCurrentSession] = useState({
    subject: '',
    class: ''
  });

  // Campus location: Latitude: 15.775002 | Longitude: 78.057125
  const campusLocation = {
    lat: 15.775002,
    lng: 78.057125,
    radius: 500 // meters
  };

  // Generate location-based QR code
  const generateQRCode = async (subject: string, className: string, duration: string) => {
    // Store session information
    setCurrentSession({
      subject,
      class: className
    });

    // Create QR data with location information
    const qrContent = {
      type: 'attendance',
      subject: subject,
      class: className,
      duration: duration,
      location: campusLocation,
      timestamp: new Date().toISOString(),
      sessionId: Math.random().toString(36).substring(2, 15),
      expiresAt: new Date(Date.now() + parseInt(duration) * 60000).toISOString() // Add expiration time
    };

    try {
      const qrString = JSON.stringify(qrContent);
      const qrUrl = await QRCode.toDataURL(qrString);
      setQrData(qrUrl);
      setQrGenerated(true);
      setSessionActive(true);
      setSessionTimer(parseInt(duration) * 60); // Convert minutes to seconds
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Register face with backend API
  const registerFaceWithBackend = async (imageData: string) => {
    setFaceRegistrationError(null);

    try {
      const result = await faceService.registerFace(imageData);

      if (result.success) {
        setFaceRegistrationSuccess(true);
        setCameraActive(false);
        setNotification({
          message: "Face registered successfully!",
          type: "success"
        });
      } else {
        setNotification({
          message: result.message || "Face registration failed. Please try again.",
          type: "error"
        });
        setFaceRegistrationError(result.message || 'Face registration failed');
      }
    } catch (error: unknown) {
      console.error('Face registration error:', error);
      setNotification({
        message: error instanceof Error ? error.message : "An error occurred during face registration. Please try again.",
        type: "error"
      });
      // More detailed error message for debugging
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during face registration. Please try again.';
      setFaceRegistrationError(errorMessage);
    }
  };

  // Fetch user profile data and other data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile data
        const profile = await authAPI.getProfile();
        setProfileData({
          name: profile.name || '',
          department: profile.department || ''
        });

        // Set profile picture if it exists
        if (profile.profilePicture) {
          setProfilePicture(profile.profilePicture);
        }

        // Fetch students
        const studentsData = await facultyAttendanceAPI.getStudents();
        setStudents(studentsData);

        // Note: Subjects functionality removed for now

        // Fetch faculty overview
        const overviewData = await facultyAttendanceAPI.getFacultyOverview();
        setFacultyOverview(overviewData);
      } catch (error: unknown) {
        console.error('Failed to fetch data:', error);
        setNotification({
          message: error instanceof Error ? error.message : 'Failed to load data. Please try again later.',
          type: 'error'
        });
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

  const totalStudents = students.length;
  const activeClasses = facultyOverview.length;
  const presentToday = facultyOverview.filter((record) => record.status === 'present').length;
  const avgAttendance = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 1000) / 10 : 0;

  const stats = [
    { label: 'Active Classes', value: `${activeClasses}`, icon: Users, trend: 'up' },
    { label: 'Avg Attendance', value: `${avgAttendance}%`, icon: BarChart3, trend: avgAttendance > 80 ? 'up' : 'neutral' },
    { label: 'Total Students', value: `${totalStudents}`, icon: Users, trend: 'neutral' },
    { label: 'Active Sessions', value: `${activeClasses}`, icon: Clock, trend: 'up' },
  ];

  return (
    <main className="min-h-screen bg-primary-bg">
      {/* Faculty Portal Header - Clearly identifies this as the Faculty Portal */}
      <header className="sticky top-0 z-50 bg-primary-bg/80 backdrop-blur-sm border-b border-primary">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <GraduationCap className="w-8 h-8 text-accent-bronze" />
            <div>
              <h1 className="text-subheader-md text-text-primary font-medium">Faculty Portal</h1>
              <p className="text-body-md text-text-secondary">Class Management Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-body-md text-text-primary bg-accent-bronze/10 px-3 py-1 rounded-full">
              {profileData.name || 'Faculty User'} ({profileData.department || 'Department'})
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
              </div>
              <p className="text-body-md text-text-secondary mb-1">{stat.label}</p>
              <p className="text-header-md text-text-primary font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="premium-card rounded-xl shadow-soft overflow-hidden">
          <div className="border-b border-primary px-6">
            <div className="flex gap-8">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'generate', label: 'Generate QR', icon: QrCode },
                { id: 'reports', label: 'Reports', icon: BarChart3 },
                { id: 'proxy', label: 'Proxy Attendance', icon: Users },
                { id: 'face', label: 'Face Management', icon: Camera },
                { id: 'profile', label: 'Profile', icon: User },
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
            {activeTab === 'generate' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-3xl mx-auto"
              >
                <h2 className="text-header-md text-text-primary mb-8 text-center font-serif">Generate Location-Based QR Code</h2>

                {!qrGenerated ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Subject</label>
                        <input
                          type="text"
                          className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                          id="subject"
                          placeholder="Enter subject name"
                        />
                      </div>
                      <div>
                        <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Class</label>
                        <input
                          type="text"
                          className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                          id="class"
                          placeholder="Enter class name"
                        />
                      </div>
                      <div>
                        <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Duration (minutes)</label>
                        <select className="premium-input w-full px-4 py-3 rounded-lg text-body-md" id="duration">
                          <option value="1">1 minute</option>
                          <option value="2">2 minutes</option>
                          <option value="3">3 minutes</option>
                          <option value="4">4 minutes</option>
                          <option value="5">5 minutes</option>
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="45">45 minutes</option>
                          <option value="60">60 minutes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Location</label>
                        <div className="premium-input w-full px-4 py-3 rounded-lg text-body-md flex items-center">
                          <MapPin className="w-5 h-5 text-accent-bronze mr-2" />
                          <span>Lat: {campusLocation.lat} | Lng: {campusLocation.lng} (±{campusLocation.radius}m)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const subject = (document.getElementById('subject') as HTMLInputElement).value;
                        const className = (document.getElementById('class') as HTMLInputElement).value;
                        const duration = (document.getElementById('duration') as HTMLSelectElement).value;
                        generateQRCode(subject, className, duration);
                      }}
                      className="premium-button primary w-full py-4 rounded-full text-label uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Generate Location-Based QR Code
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-6">
                    <div className="premium-card p-8 rounded-xl inline-block border-bronze-glow">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrData} alt="Attendance QR Code" className="w-64 h-64" />
                    </div>
                    <div className="premium-card p-6 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-text-secondary text-body-md uppercase tracking-wider">Session Status</span>
                        <span className={`text-body-lg font-medium ${sessionActive ? 'text-green-600' : 'text-red-600'}`}>
                          {sessionActive ? 'Active' : 'Expired'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-md">
                        <div>
                          <p className="text-text-secondary uppercase tracking-wider">Subject</p>
                          <p className="text-text-primary font-medium">{currentSession.subject || 'Computer Science'}</p>
                        </div>
                        <div>
                          <p className="text-text-secondary uppercase tracking-wider">Class</p>
                          <p className="text-text-primary font-medium">{currentSession.class || 'CSE-A-2024'}</p>
                        </div>
                        <div>
                          <p className="text-text-secondary uppercase tracking-wider">Location</p>
                          <p className="text-text-primary font-medium">Campus Area</p>
                        </div>
                        <div>
                          <p className="text-text-secondary uppercase tracking-wider">Time Remaining</p>
                          <p className={`text-text-primary font-medium ${sessionTimer < 60 ? 'text-red-600' : 'text-accent-bronze'}`}>
                            {formatTime(sessionTimer)}
                            {sessionTimer < 60 && sessionTimer > 0 && ' (Expiring soon!)'}
                          </p>
                        </div>
                      </div>
                      {sessionTimer > 0 && (
                        <div className="mt-4 pt-4 border-t border-primary">
                          <p className="text-text-secondary text-body-sm">
                            Session expires at: {new Date(Date.now() + sessionTimer * 1000).toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <button className="flex-1 premium-button py-3 rounded-full text-label uppercase tracking-wider hover:scale-105 transition-transform">
                        <Download className="w-5 h-5 inline mr-2" />
                        Download QR
                      </button>
                      <button
                        onClick={() => {
                          setQrGenerated(false);
                          setSessionActive(false);
                        }}
                        className="flex-1 premium-button primary py-3 rounded-full text-label uppercase tracking-wider hover:scale-105 transition-transform"
                      >
                        Generate New
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-subheader-lg text-text-primary mb-6 font-serif">Attendance Reports</h2>
                {loadingData ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="luxury-loader"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {[
                        { label: 'Total Records', value: `${facultyOverview.length}` },
                        { label: 'Present', value: `${presentToday}` },
                        { label: 'Absent', value: `${facultyOverview.length - presentToday}` },
                      ].map((stat, i) => (
                        <div key={i} className="premium-card p-6 rounded-xl shadow-soft hover:shadow-bronze-glow transition-all">
                          <p className="text-body-md text-text-secondary mb-1 uppercase tracking-wider">{stat.label}</p>
                          <p className="text-header-md text-text-primary font-bold">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="chart-container h-64 flex items-center justify-center rounded-xl">
                      <p className="text-text-secondary text-body-md">Attendance trend visualization</p>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-subheader-lg text-text-primary mb-6 font-serif">Recent Classes</h2>
                {loadingData ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="luxury-loader"></div>
                  </div>
                ) : facultyOverview.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-body-md text-text-secondary">No recent classes found</p>
                    <p className="text-body-sm text-text-secondary mt-2">Generate a QR code to start tracking attendance</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {facultyOverview.slice(0, 3).map((record, i: number) => (
                      <div key={i} className="premium-card p-4 rounded-xl flex items-center justify-between hover:shadow-soft transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-accent-bronze/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-accent-bronze" />
                          </div>
                          <div>
                            <p className="text-body-lg text-text-primary font-medium">
                              {record.user?.name || 'Unknown Student'}
                            </p>
                            <p className="text-body-md text-text-secondary">
                              {record.user?.studentId || 'N/A'} • {record.checkInAt ? new Date(record.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No check-in'}
                            </p>
                          </div>
                        </div>
                        <span className="text-accent-bronze text-body-lg font-medium">
                          {record.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'proxy' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-subheader-lg text-text-primary mb-6 font-serif">Proxy Attendance</h2>
                <ProxyAttendance />
              </motion.div>
            )}

            {activeTab === 'face' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-3xl mx-auto"
              >
                <h2 className="text-header-md text-text-primary mb-8 text-center font-serif">Face Management</h2>

                <div className="space-y-8">
                  <div className="premium-card p-6 rounded-xl">
                    <h3 className="text-subheader-md text-text-primary mb-4 font-medium">Register Your Face</h3>
                    <p className="text-body-md text-text-secondary mb-6">
                      Register your face for enhanced security and access control within the system.
                    </p>

                    {faceRegistrationSuccess ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h4 className="text-subheader-md text-text-primary font-medium mb-2">Face Registered Successfully</h4>
                        <p className="text-body-md text-text-secondary mb-6">
                          Your face has been successfully registered in the system.
                        </p>
                        <button
                          onClick={() => {
                            setFaceRegistrationSuccess(false);
                            setFaceRegistrationError(null);
                          }}
                          className="premium-button primary px-6 py-3 rounded-full text-label"
                        >
                          Register Another Face
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {!cameraActive ? (
                          <div className="text-center">
                            <button
                              onClick={() => setCameraActive(true)}
                              className="premium-button primary px-8 py-4 rounded-full text-label flex items-center gap-2 mx-auto"
                            >
                              <Camera className="w-5 h-5" />
                              Open Camera to Register Face
                            </button>
                            <p className="text-body-md text-text-secondary mt-4">
                              Click the button above to open your camera and register your face.
                            </p>
                          </div>
                        ) : (
                          <FaceCamera
                            onCapture={registerFaceWithBackend}
                            onClose={() => setCameraActive(false)}
                            title="Face Registration"
                            instruction="Position your face in the frame and click the camera button to register"
                          />
                        )}

                        {faceRegistrationError && (
                          <div className="premium-card p-4 rounded-xl bg-red-50 border border-red-200 mt-4">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-body-md text-red-800 font-medium">Face Registration Failed</p>
                                <p className="text-body-sm text-red-700 mt-1">{faceRegistrationError}</p>
                                <button
                                  onClick={() => {
                                    setFaceRegistrationError(null);
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
                      </div>
                    )}
                  </div>

                  <div className="premium-card p-6 rounded-xl">
                    <h3 className="text-subheader-md text-text-primary mb-4 font-medium">Face Verification Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-body-md text-text-primary font-medium">Require Face Verification</p>
                          <p className="text-body-sm text-text-secondary">Require face verification for sensitive operations</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-bronze"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-body-md text-text-primary font-medium">Allow Proxy Attendance</p>
                          <p className="text-body-sm text-text-secondary">Allow attendance marking through authorized proxies</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-bronze"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
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
                        <p className="text-body-md text-text-secondary">{profileData.department} Department</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              // Initialize edited data with current profile data
                              setEditedProfileData({
                                name: profileData.name || '',
                                email: '',
                                employeeId: '',
                                department: profileData.department || ''
                              });
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
                                  name: profileData.name,
                                  department: profileData.department,
                                  profilePicture: profilePicture || undefined
                                };

                                // Update profile data
                                await authAPI.updateProfile(profileUpdateData);
                                setProfileData({
                                  name: profileData.name,
                                  department: profileData.department
                                });
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
                            <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Employee ID</label>
                            <input
                              type="text"
                              value={editedProfileData.employeeId}
                              onChange={(e) => setEditedProfileData({ ...editedProfileData, employeeId: e.target.value })}
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
                                // FIX: Update the profileData state with the full response from the server
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
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Department</label>
                          <p className="premium-input w-full px-4 py-3 rounded-lg text-body-md">{profileData.department}</p>
                        </div>
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Email</label>
                          <p className="premium-input w-full px-4 py-3 rounded-lg text-body-md">Not set</p>
                        </div>
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Employee ID</label>
                          <p className="premium-input w-full px-4 py-3 rounded-lg text-body-md">Not set</p>
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
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Current Password</label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                              className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                            />
                            <button
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute inset-y-0 right-0 flex items-center px-4"
                            >
                              {showCurrentPassword ? <EyeOff className="w-5 h-5 text-text-secondary" /> : <Eye className="w-5 h-5 text-text-secondary" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">New Password</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                            />
                            <button
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute inset-y-0 right-0 flex items-center px-4"
                            >
                              {showNewPassword ? <EyeOff className="w-5 h-5 text-text-secondary" /> : <Eye className="w-5 h-5 text-text-secondary" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Confirm New Password</label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              className="premium-input w-full px-4 py-3 rounded-lg text-body-md"
                            />
                            <button
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute inset-y-0 right-0 flex items-center px-4"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5 text-text-secondary" /> : <Eye className="w-5 h-5 text-text-secondary" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button
                            onClick={async () => {
                              try {
                                // Validate passwords
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
                                setNotification({
                                  message: 'Password changed successfully!',
                                  type: 'success'
                                });
                              } catch (error: unknown) {
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
                            onClick={() => {
                              // Save face settings (this would be implemented with an API call)
                              setFaceSettingsActive(false);
                              setNotification({
                                message: 'Face recognition settings updated!',
                                type: 'success'
                              });
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
          </div>
        </div>
      </div>
    </main>
  );
}