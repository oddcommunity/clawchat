/**
 * Connection status hook
 *
 * Monitors both network connectivity and Matrix server connection
 */

import { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getMatrixClient } from '../matrix/client';

export interface ConnectionStatus {
  isNetworkConnected: boolean;
  isServerConnected: boolean;
  isFullyConnected: boolean;
}

export function useConnection(): ConnectionStatus {
  const [networkConnected, setNetworkConnected] = useState(true);
  const [serverConnected, setServerConnected] = useState(false);

  useEffect(() => {
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkConnected(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check server connection when network is available
    const checkServer = async () => {
      if (!networkConnected) {
        setServerConnected(false);
        return;
      }

      try {
        const client = getMatrixClient();
        setServerConnected(client.isConnected());
      } catch {
        setServerConnected(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [networkConnected]);

  return {
    isNetworkConnected: networkConnected,
    isServerConnected: serverConnected,
    isFullyConnected: networkConnected && serverConnected,
  };
}

export default useConnection;
