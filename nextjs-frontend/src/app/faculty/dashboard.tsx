'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, BarChart3, Users, Clock, Download, Plus, LogOut, MapPin, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import FaceCamera from '@/components/FaceCamera';
import { faceService } from '@/services/faceService';
import { authAPI, redirectToLogin } from '@/services/api';

export default function EnhancedFacultyDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrData, setQrData] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceRegistrationSuccess, setFaceRegistrationSuccess] = useState(false);
  const [faceRegistrationError, setFaceRegistrationError] = useState<string | null>(null);
  // Note: faceRegistrationLoading removed as it's not used in this component

  // Campus location: Latitude: 15.775002 | Longitude: 78.057125
  const campusLocation = {
    lat: 15.775002,
    lng: 78.057125,
    radius: 500 // meters
  };

  // Generate location-based QR code
  const generateQRCode = async (subject: string, className: string, duration: string) => {
    // Create QR data with location information
    const qrContent = {
      type: 'attendance',
      source: 'SOLVRA_FACULTY_DASHBOARD', // Added for validation
      subject: subject,
      class: className,
      duration: duration,
      location: campusLocation,
      timestamp: new Date().toISOString(),
      sessionId: Math.random().toString(36).substring(2, 15)
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
      } else {
        setFaceRegistrationError(result.message || 'Face registration failed');
      }
    } catch (error: unknown) {
      console.error('Face registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during face registration. Please try again.';
      setFaceRegistrationError(errorMessage);
    }
  };

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

  const stats = [
    { label: 'Active Classes', value: '5', icon: Users, trend: 'up' },
    { label: 'Avg Attendance', value: '87.3%', icon: BarChart3, trend: 'up' },
    { label: 'Total Students', value: '156', icon: Users, trend: 'neutral' },
    { label: 'Active Sessions', value: '2', icon: Clock, trend: 'up' },
  ];

  return (
    <main className="min-h-screen bg-primary-bg">
      <header className="sticky top-0 z-50 bg-primary-bg/80 backdrop-blur-sm border-b border-primary">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-accent-bronze flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-subheader-md text-text-primary font-medium">Prof. Sarah Johnson</h1>
              <p className="text-body-md text-text-secondary">Computer Science Department</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
                { id: 'face', label: 'Face Management', icon: Camera },
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
                          <p className="text-text-primary font-medium">Computer Science</p>
                        </div>
                        <div>
                          <p className="text-text-secondary uppercase tracking-wider">Class</p>
                          <p className="text-text-primary font-medium">CSE-A-2024</p>
                        </div>
                        <div>
                          <p className="text-text-secondary uppercase tracking-wider">Location</p>
                          <p className="text-text-primary font-medium">Campus Area</p>
                        </div>
                        <div>
                          <p className="text-text-secondary uppercase tracking-wider">Time Remaining</p>
                          <p className="text-text-primary font-medium text-accent-bronze">{formatTime(sessionTimer)}</p>
                        </div>
                      </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {[
                    { label: 'Total Records', value: '1,234' },
                    { label: 'Present', value: '1,089' },
                    { label: 'Absent', value: '145' },
                  ].map((stat, i) => (
                    <div key={i} className="premium-card p-6 rounded-xl shadow-soft hover:shadow-bronze-glow transition-all">
                      <p className="text-body-md text-text-secondary mb-1 uppercase tracking-wider">{stat.label}</p>
                      <p className="text-header-md text-text-primary font-bold">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="chart-container h-64 flex items-center justify-center rounded-xl">
                  <p className="text-text-secondary text-body-md">Chart visualization</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-subheader-lg text-text-primary mb-6 font-serif">Recent Classes</h2>
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="premium-card p-4 rounded-xl flex items-center justify-between hover:shadow-soft transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-accent-bronze/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-accent-bronze" />
                        </div>
                        <div>
                          <p className="text-body-lg text-text-primary font-medium">Computer Science - Lecture {item}</p>
                          <p className="text-body-md text-text-secondary">CSE-A-2024 • 45 students</p>
                        </div>
                      </div>
                      <span className="text-accent-bronze text-body-lg font-medium">92% Attendance</span>
                    </div>
                  ))}
                </div>
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
          </div>
        </div>
      </div>
    </main>
  );
}