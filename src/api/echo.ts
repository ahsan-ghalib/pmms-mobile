import Echo from 'laravel-echo';
import axiosInstance from './axios';

// React Native requires the react-native specific entry point for pusher-js
import PusherModule from 'pusher-js/react-native';
const Pusher = PusherModule.Pusher || PusherModule.default || PusherModule;

// Optional: Enable pusher logging to Metro console
Pusher.logToConsole = true;

const pusherClient = new Pusher(process.env.EXPO_PUBLIC_REVERB_APP_KEY || '08cf74353aa9c44a7a2c', {
  cluster: '', // Required by pusher-js, but unused by Reverb
  wsHost: process.env.EXPO_PUBLIC_REVERB_HOST || '127.0.0.1',
  wsPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT || 8080),
  wssPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT || 8080),
  forceTLS: (process.env.EXPO_PUBLIC_REVERB_SCHEME ?? 'http') === 'https',
  enabledTransports: ['ws', 'wss'],
  authorizer: (channel: any, _options: any) => {
    return {
      authorize: (socketId: string, callback: (error: boolean, data: any) => void) => {
        axiosInstance
          .post('/broadcasting/auth', {
            socket_id: socketId,
            channel_name: channel.name,
          })
          .then((response) => {
            callback(false, response.data);
          })
          .catch((error) => {
            console.error('Echo authorization error:', error);
            callback(true, error);
          });
      },
    };
  },
});

const echo = new Echo({
  broadcaster: 'reverb',
  client: pusherClient,
});

export default echo;

console.log(
  'Echo initialized. Pusher connection state:',
  echo.connector?.pusher?.connection?.state,
);
