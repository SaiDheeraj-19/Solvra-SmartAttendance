const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Helper function to handle API calls with better error handling
const apiCall = async (url: string, options: RequestInit) => {
  try {
    const response = await fetch(url, {
      ...options,
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const error = await response.json();
        errorMessage = error.msg || error.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch (error) {
        console.log('Error parsing error response:', error);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    // Handle network errors specifically
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
    }

    // Handle timeout errors
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error('Request timeout: The server is taking too long to respond. Please try again.');
    }

    // Re-throw other errors
    throw error;
  }
};

// Auth API functions
export const authAPI = {
  // Student registration
  registerStudent: async (userData: {
    name: string;
    email: string;
    password: string;
    studentId: string;
  }) => {
    return apiCall(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...userData,
        role: 'student'
      }),
    });
  },

  // Faculty registration
  registerFaculty: async (userData: {
    name: string;
    email: string;
    password: string;
    employeeId: string;
    department: string;
  }) => {
    return apiCall(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...userData,
        studentId: userData.employeeId, // Backend uses studentId field for both
        role: 'faculty'
      }),
    });
  },

  // Login
  login: async (email: string, password: string) => {
    return apiCall(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
  },

  // Logout
  logout: async () => {
    // For JWT-based auth, logout is typically handled client-side
    // Remove token from localStorage
    localStorage.removeItem('token');

    // Optional: Call backend logout endpoint if one exists
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.log('Logout endpoint error:', error);
      // Ignore errors for logout
      console.log('Logout endpoint not available or failed');
    }
  },

  // Get current user profile
  getProfile: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      // Add cache-busting to prevent stale data
      cache: 'no-cache'
    });
  },

  // Update user profile
  updateProfile: async (profileData: {
    name?: string;
    email?: string;
    studentId?: string;
    department?: string;
    year?: string;
    phone?: string;
    profilePicture?: string;
  }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });
  }
};

// Attendance API functions
export const attendanceAPI = {
  // Check-in
  checkIn: async (locationData: { lat: number; lng: number; accuracy?: number }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(locationData)
    });
  },

  // Check-out
  checkOut: async (locationData: { lat: number; lng: number; accuracy?: number }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(locationData)
    });
  },

  // Proxy check-in
  proxyCheckIn: async (targetUserId: string, locationData: { lat: number; lng: number; accuracy?: number }, reason: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/proxy-check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        targetUserId,
        reason,
        ...locationData
      })
    });
  },

  // Toggle proxy attendance permission
  toggleProxyAttendancePermission: async (allowProxyAttendance: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/proxy-permission`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ allowProxyAttendance })
    });
  },

  // Get proxy attendance history
  getProxyAttendanceHistory: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/proxy-history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get attendance history
  getAttendanceHistory: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get attendance summary
  getSummary: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/summary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get attendance analytics
  getAnalytics: async (period: string = '30') => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/analytics?period=${period}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }
};

// Faculty Attendance API functions
export const facultyAttendanceAPI = {
  // Get all students
  getStudents: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/students`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get subjects
  getSubjects: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/subjects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get faculty overview
  getFacultyOverview: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/faculty-overview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get attendance for specific date
  getAttendanceForDate: async (date: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    return apiCall(`${API_BASE_URL}/attendance/faculty-date/${date}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }
};

// Utility functions
export const setAuthToken = (token: string) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      // Basic check for JWT format (header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      // If token is invalid/corrupted, clear it to prevent persistent errors
      localStorage.removeItem('token');
      return null;
    }
  }
  return null;
};

// Navigation function
export const redirectToLogin = () => {
  // Remove token and redirect to login
  setAuthToken('');
  window.location.href = '/login';
};

// Get user role and determine appropriate dashboard
export const getUserDashboardPath = (userRole: string) => {
  switch (userRole) {
    case 'student':
      return '/student';
    case 'faculty':
      return '/faculty';
    case 'admin':
      return '/admin';
    default:
      return '/student'; // Default fallback
  }
};

// Force refresh user data
export const refreshUserData = async () => {
  // Clear any cached data
  localStorage.removeItem('cachedProfile');

  // Fetch fresh profile data
  const profile = await authAPI.getProfile();

  // Cache the fresh data
  localStorage.setItem('cachedProfile', JSON.stringify({
    data: profile,
    timestamp: Date.now()
  }));

  return profile;
};

// Get cached user data with expiration
export const getCachedUserData = () => {
  const cached = localStorage.getItem('cachedProfile');
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached);
    // Expire cache after 5 minutes
    if (Date.now() - parsed.timestamp > 5 * 60 * 1000) {
      localStorage.removeItem('cachedProfile');
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.log('Error parsing cached profile:', error);
    localStorage.removeItem('cachedProfile');
    return null;
  }
};