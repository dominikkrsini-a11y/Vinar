import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

// Simple connectivity flag for UI purposes only (e.g. an offline banner).
// It does not gate reads/writes — Firestore's own local cache and offline
// mutation queue (see src/firebase/config.js) already handle that.
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Network.getNetworkStateAsync()
      .then((state) => {
        if (isMounted) setIsOnline(state.isConnected !== false);
      })
      .catch(() => {
        // If detection fails, assume online rather than showing a
        // potentially-wrong offline banner.
      });

    const subscription = Network.addNetworkStateListener((state) => {
      setIsOnline(state.isConnected !== false);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return { isOnline };
}
