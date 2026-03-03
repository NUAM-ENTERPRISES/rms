import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { useNotificationSettings } from '../hooks/useNotificationSettings';

// mock the RTK Query hooks defined on notificationsApi
jest.mock('../data/notifications.endpoints', () => {
  const actual = jest.requireActual('../data/notifications.endpoints');
  return {
    ...actual,
    notificationsApi: {
      ...actual.notificationsApi,
      useGetSettingsQuery: jest.fn(),
      useUpdateSettingsMutation: jest.fn(),
    },
  };
});

import { notificationsApi } from '../data/notifications.endpoints';

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe('useNotificationSettings hook', () => {
  let store: any;

  beforeEach(() => {
    store = mockStore({ notificationSettings: { muted: false } });
  });

  it('initializes state from server setting', () => {
    // stub query hook to return muted=true
    (notificationsApi.useGetSettingsQuery as jest.Mock).mockReturnValue({ data: { data: { muted: true } } });
    (notificationsApi.useUpdateSettingsMutation as jest.Mock).mockReturnValue([jest.fn()]);

    const wrapper = ({ children }: any) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useNotificationSettings(), { wrapper });

    expect(result.current.muted).toBe(true);
  });

  it('toggle calls updateSettings and flips state', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ data: { muted: true } });
    (notificationsApi.useGetSettingsQuery as jest.Mock).mockReturnValue({ data: { data: { muted: false } } });
    (notificationsApi.useUpdateSettingsMutation as jest.Mock).mockReturnValue([mockUpdate]);

    const wrapper = ({ children }: any) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useNotificationSettings(), { wrapper });

    expect(result.current.muted).toBe(false);
    await act(async () => {
      await result.current.toggle();
    });

    expect(mockUpdate).toHaveBeenCalledWith({ muted: true });
    const actions = store.getActions().map((a: any) => a.type);
    expect(actions).toContain('notificationSettings/setMuted');
  });
});
