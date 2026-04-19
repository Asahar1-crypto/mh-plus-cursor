import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mhplus.familyfinance',
  appName: 'מחציות פלוס',
  webDir: 'dist',
  
  // Server config - uncomment for development hot reload
  // server: {
  //   url: 'http://YOUR_LOCAL_IP:8080',
  //   cleartext: true,
  // },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F172A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0F172A',
    },
    CapacitorHttp: {
      enabled: true,
    },
  },

  android: {
    allowMixedContent: false,
    backgroundColor: '#0F172A',
  },

  ios: {
    backgroundColor: '#0F172A',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'mhplus',
  },
};

export default config;