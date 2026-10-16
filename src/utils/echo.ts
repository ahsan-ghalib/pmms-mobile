import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';

const resolveConstructor = (module: any, name: string = 'default'): any => {
  if (!module) return null;
  if (typeof module === 'function') return module;
  if (typeof module === 'object') {
    if (typeof module[name] === 'function') return module[name];
    if (typeof module.default === 'function') return module.default;
    if (module.default && typeof module.default[name] === 'function') return module.default[name];
    if (module.default && typeof module.default.default === 'function')
      return module.default.default;
  }
  return module;
};

let echoInstance: any = null;

try {
  const PusherClient = resolveConstructor(Pusher, 'Pusher');
  const EchoClass = resolveConstructor(Echo, 'Echo');

  if (
    PusherClient &&
    typeof PusherClient === 'function' &&
    EchoClass &&
    typeof EchoClass === 'function'
  ) {
    if (typeof window !== 'undefined') (window as any).Pusher = PusherClient;
    if (typeof globalThis !== 'undefined') (globalThis as any).Pusher = PusherClient;

    const pusherClient = new PusherClient(
      process.env.EXPO_PUBLIC_REVERB_APP_KEY || '08cf74353aa9c44a7a2c',
      {
        cluster: '', // Required by pusher-js, but unused by Reverb
        wsHost: process.env.EXPO_PUBLIC_REVERB_HOST || '127.0.0.1',
        wsPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? 8080),
        wssPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? 8080),
        forceTLS: (process.env.EXPO_PUBLIC_REVERB_SCHEME ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
      },
    );

    echoInstance = new EchoClass({
      broadcaster: 'reverb',
      client: pusherClient,
    });

    console.log('Echo initialized. Pusher connection state:', pusherClient.connection?.state);
  } else {
    console.warn('Echo/Pusher could not be resolved to constructors.');
  }
} catch (error) {
  console.warn('Failed to initialize Echo/Pusher:', error);
}

export const echo = echoInstance;
export default echoInstance;
