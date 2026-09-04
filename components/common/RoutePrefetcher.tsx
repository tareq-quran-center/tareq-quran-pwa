"use client";


/**
 * RoutePrefetcher: Disabled automated prefetching for dynamic SSR routes
 * to prevent unnecessary Vercel Serverless Function invocations and Fast Origin Transfer.
 * Next.js Link components handle on-demand navigation efficiently.
 */
export function RoutePrefetcher() {
  return null;
}

