import { addDoc } from 'firebase/firestore';
import { buildEventPayload, track, trackScreenView, EVENTS } from '../analytics';

// jest.mock calls are hoisted above the imports by babel-jest.
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'events-collection'),
  addDoc: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../firebase/config', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-1' } },
}));

describe('buildEventPayload', () => {
  const now = new Date('2026-08-08T12:00:00.000Z');

  test('builds a complete payload', () => {
    expect(
      buildEventPayload({
        event: 'wine_added',
        props: { type: 'red' },
        userId: 'u1',
        appVersion: '1.0.0',
        now,
      })
    ).toEqual({
      event: 'wine_added',
      props: { type: 'red' },
      userId: 'u1',
      appVersion: '1.0.0',
      createdAt: '2026-08-08T12:00:00.000Z',
    });
  });

  test('returns null without an event name', () => {
    expect(buildEventPayload({ event: '', now })).toBeNull();
    expect(buildEventPayload({ event: null, now })).toBeNull();
    expect(buildEventPayload({ event: 42, now })).toBeNull();
  });

  test('drops empty and non-primitive prop values', () => {
    const payload = buildEventPayload({
      event: 'calc_so2_used',
      props: {
        product: 'kmbs',
        sufficient: false,
        count: 0,
        empty: '',
        missing: undefined,
        nothing: null,
        nested: { a: 1 },
        list: [1, 2],
      },
      now,
    });
    expect(payload.props).toEqual({ product: 'kmbs', sufficient: false, count: 0 });
  });

  test('defaults userId and appVersion', () => {
    const payload = buildEventPayload({ event: 'sign_in', now });
    expect(payload.userId).toBeNull();
    expect(payload.appVersion).toBe('unknown');
  });
});

describe('track', () => {
  beforeEach(() => {
    addDoc.mockClear();
    addDoc.mockImplementation(() => Promise.resolve());
  });

  test('writes the event with the signed-in user id', () => {
    track(EVENTS.WINE_ADDED, { type: 'white' });
    expect(addDoc).toHaveBeenCalledTimes(1);
    const payload = addDoc.mock.calls[0][1];
    expect(payload.event).toBe('wine_added');
    expect(payload.props).toEqual({ type: 'white' });
    expect(payload.userId).toBe('user-1');
  });

  test('skips the write for an invalid event', () => {
    track('');
    expect(addDoc).not.toHaveBeenCalled();
  });

  test('never throws when the write fails', () => {
    addDoc.mockImplementation(() => Promise.reject(new Error('rules')));
    expect(() => track(EVENTS.SIGN_IN)).not.toThrow();
  });

  test('never throws when addDoc itself throws synchronously', () => {
    addDoc.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => track(EVENTS.SIGN_IN)).not.toThrow();
  });
});

describe('trackScreenView', () => {
  beforeEach(() => {
    addDoc.mockClear();
    addDoc.mockImplementation(() => Promise.resolve());
  });

  test('tracks a screen_view event with the screen name', () => {
    trackScreenView('Dashboard');
    expect(addDoc).toHaveBeenCalledTimes(1);
    const payload = addDoc.mock.calls[0][1];
    expect(payload.event).toBe('screen_view');
    expect(payload.props).toEqual({ screen: 'Dashboard' });
  });

  test('ignores empty screen names', () => {
    trackScreenView('');
    expect(addDoc).not.toHaveBeenCalled();
  });
});
