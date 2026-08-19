import { getSentryExpoPlugins } from '../sentryExpoPlugin';

describe('getSentryExpoPlugins', () => {
  test('does not register the plugin when org/project/token are missing', () => {
    expect(getSentryExpoPlugins({ org: '', project: '', authToken: '' })).toEqual([]);
    expect(getSentryExpoPlugins({ org: 'vinar', project: 'react-native', authToken: '' })).toEqual(
      []
    );
    expect(getSentryExpoPlugins({})).toEqual([]);
  });

  test('registers @sentry/react-native/expo with org and project when credentials exist', () => {
    expect(
      getSentryExpoPlugins({
        org: ' vinery-org ',
        project: 'vinar',
        authToken: 'sntrys_example',
      })
    ).toEqual([
      [
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          organization: 'vinery-org',
          project: 'vinar',
        },
      ],
    ]);
  });

  test('does not put the auth token in plugin props', () => {
    const plugins = getSentryExpoPlugins({
      org: 'vinery-org',
      project: 'vinar',
      authToken: 'sntrys_secret',
    });
    expect(JSON.stringify(plugins)).not.toContain('sntrys_secret');
    expect(plugins[0][1].authToken).toBeUndefined();
  });
});
