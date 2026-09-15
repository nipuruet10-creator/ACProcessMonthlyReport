/**
 * Vercel Web Analytics Integration
 * Initializes Vercel Analytics tracking for the application
 */

import { inject } from '../../node_modules/@vercel/analytics/dist/index.mjs';

// Inject Vercel Analytics
inject();

console.log('Vercel Web Analytics initialized');
