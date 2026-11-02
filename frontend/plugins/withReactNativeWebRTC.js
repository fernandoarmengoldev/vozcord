const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

/**
 * Plugin para configurar react-native-webrtc en Expo
 */
const withReactNativeWebRTC = (config) => {
  // Configuración para Android
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    // Asegurar que uses-permission está presente
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    // Agregar permisos necesarios si no existen
    const permissions = [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
    ];

    permissions.forEach((permission) => {
      if (
        !androidManifest['uses-permission'].find(
          (p) => p.$['android:name'] === permission
        )
      ) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    return config;
  });

  // Configuración para iOS
  config = withInfoPlist(config, (config) => {
    if (!config.modResults.NSCameraUsageDescription) {
      config.modResults.NSCameraUsageDescription =
        'Esta app necesita acceso a la cámara para llamadas de video';
    }

    if (!config.modResults.NSMicrophoneUsageDescription) {
      config.modResults.NSMicrophoneUsageDescription =
        'Esta app necesita acceso al micrófono para llamadas de voz';
    }

    return config;
  });

  return config;
};

module.exports = withReactNativeWebRTC;
