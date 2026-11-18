import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.personalfinance.app',
  appName: 'Personal Finance',
  webDir: 'dist',
  plugins: {
    // Informa ao app o tamanho das barras do Android (relógio/bateria e
    // navegação) pelas variáveis --safe-area-inset-*, para o conteúdo
    // não ficar por baixo delas.
    SystemBars: {
      insetsHandling: 'css',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#7C3AED',
    },
  },
};

export default config;
