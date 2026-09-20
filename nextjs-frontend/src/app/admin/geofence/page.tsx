'use client';

// import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the AdminGeofenceUpdater component to avoid SSR issues
const AdminGeofenceUpdater = dynamic(() => import('@/components/AdminGeofenceUpdater'), { ssr: false });

export default function AdminGeofencePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Campus Geofence Management</h1>
          <p className="text-gray-600">Update the campus boundary for attendance tracking</p>
        </div>

        <AdminGeofenceUpdater />

        <div className="mt-12 bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">About Campus Geofence</h2>
          <p className="text-gray-600 mb-4">
            The campus geofence defines the boundary within which students must be located to mark their attendance.
            Adjust the center coordinates and radius to match your campus boundaries.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Center Coordinates</h3>
              <p className="text-blue-700 text-sm">
                The central point of your campus. Students must be within the defined radius from this point.
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Radius</h3>
              <p className="text-green-700 text-sm">
                The distance in meters from the center point that defines the campus boundary.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}