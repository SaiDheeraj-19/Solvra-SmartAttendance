'use client';

import { useEffect } from 'react';

export default function TokenSafety() {
    useEffect(() => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                // Simple check: splitting by dot should yield 3 parts
                const parts = token.split('.');
                if (parts.length !== 3) {
                    console.warn('TokenSafety: Invalid token format, clearing.');
                    localStorage.removeItem('token');
                    return;
                }

                // Try decoding payload to ensure it is valid base64
                try {
                    atob(parts[1]);
                } catch (e) {
                    console.warn('TokenSafety: Token payload invalid base64, clearing.', e);
                    localStorage.removeItem('token');
                }
            }
        } catch (err) {
            console.error('TokenSafety error:', err);
            // If safery check fails, nuke it to be safe
            localStorage.removeItem('token');
        }
    }, []);

    return null;
}
