import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      // Public base URL for the local assistant proxy.
      // Override on physical devices to: http://<your-lan-ip>:3001
      assistantBaseUrl:
        process.env.EXPO_PUBLIC_ASSISTANT_BASE_URL || 'http://localhost:3001',
    },
  };
};

