'use client';

// import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the LocationDebugger component to avoid SSR issues
const LocationDebugger = dynamic(() => import('@/components/LocationDebugger'), { ssr: false });

export default function LocationTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Location Test</h1>
          <p className="text-gray-600">Test if your current location is within the campus boundary</p>
        </div>

        <LocationDebugger />

        <div className="mt-12 bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">How to Use This Tool</h2>
          <ol className="list-decimal pl-5 space-y-2 text-gray-600">
            <li>Click &quot;Get My Location&quot; to retrieve your current GPS coordinates</li>
            <li>Click &quot;Test Against Campus&quot; to check if you&apos;re within the campus boundary</li>
            <li>If you&apos;re outside the boundary, try moving to a different location</li>
            <li>If issues persist, contact your system administrator</li>
          </ol>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">💡 Tips for Better Accuracy</h3>
            <ul className="list-disc pl-5 space-y-1 text-yellow-700">
              <li>Ensure you&apos;re outdoors with a clear view of the sky</li>
              <li>Allow sufficient time for GPS to lock onto satellites</li>
              <li>Enable high accuracy mode on your device</li>
              <li>Restart your device&apos;s location services if needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}