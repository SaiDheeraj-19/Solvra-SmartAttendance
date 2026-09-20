'use client';

import { useState, useEffect } from 'react';
import { Search, User, CheckCircle, X, MapPin } from 'lucide-react';
import { facultyAttendanceAPI, attendanceAPI } from '@/services/api';

interface Student {
  _id: string;
  name: string;
  email: string;
  studentId: string;
  department: string;
  year: string;
}

interface ProxyAttendanceRecord {
  _id: string;
  user: {
    name: string;
    email: string;
    studentId: string;
    department: string;
  };
  proxy: {
    proxyUser: {
      name: string;
      role: string;
    };
    reason: string;
    approved: boolean;
  };
  status: string;
  checkInAt: string;
  createdAt: string;
}

export default function ProxyAttendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [proxyHistory, setProxyHistory] = useState<ProxyAttendanceRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Fetch students on component mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsData = await facultyAttendanceAPI.getStudents();
        setStudents(studentsData);
        setFilteredStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
        setNotification({
          message: 'Failed to load students. Please try again.',
          type: 'error'
        });
      }
    };

    fetchStudents();
  }, []);

  // Filter students based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [searchTerm, students]);

  // Fetch proxy attendance history
  const fetchProxyHistory = async () => {
    try {
      const historyData = await attendanceAPI.getProxyAttendanceHistory();
      setProxyHistory(historyData.data);
      setShowHistory(true);
    } catch (error) {
      console.error('Error fetching proxy history:', error);
      setNotification({
        message: 'Failed to load proxy attendance history. Please try again.',
        type: 'error'
      });
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedStudent || !reason) {
      setNotification({
        message: 'Please select a student and provide a reason.',
        type: 'warning'
      });
      return;
    }

    setLoading(true);
    try {
      // Get current location (simulated for demo)
      // In a real implementation, you would use the Geolocation API
      const locationData = {
        lat: 15.775002, // Campus latitude
        lng: 78.057125, // Campus longitude
        accuracy: 10
      };

      // Mark proxy attendance
      await attendanceAPI.proxyCheckIn(selectedStudent._id, locationData, reason);

      setNotification({
        message: `Attendance marked successfully for ${selectedStudent.name}`,
        type: 'success'
      });

      // Reset form
      setSelectedStudent(null);
      setReason('');
    } catch (error: unknown) {
      console.error('Error marking proxy attendance:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific error cases
      if (errorMessage.includes('403')) {
        setNotification({
          message: 'Access denied. You may not have permission to mark proxy attendance, or the student has not enabled this feature.',
          type: 'error'
        });
      } else if (errorMessage.includes('404')) {
        setNotification({
          message: 'Student not found. Please try again or select a different student.',
          type: 'error'
        });
      } else {
        setNotification({
          message: errorMessage || 'Failed to mark attendance. Please try again.',
          type: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-800' :
            notification.type === 'error' ? 'bg-red-100 text-red-800' :
              notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
          }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Student Selection */}
        <div className="space-y-6">
          <div className="premium-card p-6 rounded-xl">
            <h3 className="text-subheader-md text-text-primary mb-4 font-medium">Select Student</h3>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                placeholder="Search students by name, ID, or email"
                className="premium-input w-full pl-10 pr-4 py-3 rounded-lg text-body-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Student List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <div
                    key={student._id}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${selectedStudent?._id === student._id
                        ? 'bg-accent-bronze/10 border border-accent-bronze'
                        : 'hover:bg-primary/50'
                      }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-bronze flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-body-md text-text-primary font-medium">{student.name}</p>
                        <p className="text-body-sm text-text-secondary">{student.studentId} • {student.department}</p>
                      </div>
                      {selectedStudent?._id === student._id && (
                        <CheckCircle className="w-5 h-5 text-accent-bronze" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <User className="w-12 h-12 mx-auto mb-2" />
                  <p>No students found</p>
                </div>
              )}
            </div>
          </div>

          {/* Reason Input */}
          {selectedStudent && (
            <div className="premium-card p-6 rounded-xl">
              <h3 className="text-subheader-md text-text-primary mb-4 font-medium">Mark Attendance for {selectedStudent.name}</h3>

              <div className="mb-4">
                <label className="block text-label text-text-secondary mb-2 uppercase tracking-wider">Reason for Proxy Attendance</label>
                <textarea
                  placeholder="Enter reason for marking attendance on behalf of this student"
                  className="premium-input w-full px-4 py-3 rounded-lg text-body-md min-h-[120px]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 text-body-sm text-text-secondary mb-4">
                <MapPin className="w-4 h-4" />
                <span>Location: Campus Area (15.775002, 78.057125)</span>
              </div>

              <button
                onClick={handleMarkAttendance}
                disabled={loading || !reason}
                className="premium-button primary w-full py-3 rounded-full text-label uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Marking Attendance...
                  </>
                ) : (
                  'Mark Attendance'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Proxy History */}
        <div className="premium-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-subheader-md text-text-primary font-medium">Proxy Attendance History</h3>
            <button
              onClick={fetchProxyHistory}
              className="premium-button py-2 px-4 rounded-full text-label text-text-secondary hover:text-text-primary"
            >
              Refresh
            </button>
          </div>

          {showHistory ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {proxyHistory.length > 0 ? (
                proxyHistory.map((record) => (
                  <div key={record._id} className="p-4 rounded-lg border border-primary">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-body-md text-text-primary font-medium">{record.user.name}</p>
                        <p className="text-body-sm text-text-secondary">{record.user.studentId}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-body-sm ${record.status === 'present'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {record.status}
                      </span>
                    </div>

                    <div className="mb-2">
                      <p className="text-body-sm text-text-secondary">Marked by: {record.proxy.proxyUser.name} ({record.proxy.proxyUser.role})</p>
                      <p className="text-body-sm text-text-secondary">Reason: {record.proxy.reason}</p>
                    </div>

                    <div className="flex justify-between text-body-sm text-text-secondary">
                      <span>On: {new Date(record.createdAt).toLocaleDateString()}</span>
                      <span>At: {new Date(record.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                  <p>No proxy attendance records found</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <button
                onClick={fetchProxyHistory}
                className="premium-button primary px-6 py-3 rounded-full text-label"
              >
                Load Proxy Attendance History
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}