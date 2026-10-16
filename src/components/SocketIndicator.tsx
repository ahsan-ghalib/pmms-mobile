import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import echo from '../api/echo';

export const SocketIndicator = () => {
  const [status, setStatus] = useState<string>('disconnected');

  useEffect(() => {
    if (!echo || !echo.connector || !echo.connector.pusher) return;

    const pusher = echo.connector.pusher;
    if (!pusher.connection) return;

    const handleStateChange = (states: any) => {
      setStatus(states.current);
    };

    pusher.connection.bind('state_change', handleStateChange);
    setStatus(pusher.connection.state);

    return () => {
      pusher.connection.unbind('state_change', handleStateChange);
    };
  }, []);

  const getColor = () => {
    switch (status) {
      case 'connected':
        return '#10B981'; // Green
      case 'connecting':
        return '#F59E0B'; // Yellow
      case 'disconnected':
      case 'unavailable':
      case 'failed':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <View
      className="absolute top-12 left-4 z-50 px-3 py-1.5 rounded-full flex-row items-center"
      pointerEvents="none"
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: getColor(),
          marginRight: 6,
        }}
      />
      {/* <Text className="text-white text-[10px] font-bold uppercase">{status}</Text> */}
    </View>
  );
};
