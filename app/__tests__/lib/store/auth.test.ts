import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../../../lib/store/auth';

// Mock the matrix client
jest.mock('../../../lib/matrix/client', () => ({
  getMatrixClient: () => ({
    login: jest.fn(() =>
      Promise.resolve({
        accessToken: 'test-token',
        userId: '@test:matrix.org',
        deviceId: 'DEVICE123',
        homeserver: 'https://matrix.org',
      })
    ),
    register: jest.fn(() =>
      Promise.resolve({
        accessToken: 'test-token',
        userId: '@newuser:matrix.org',
        deviceId: 'DEVICE123',
        homeserver: 'https://matrix.org',
      })
    ),
    restoreSession: jest.fn(() => Promise.resolve()),
    logout: jest.fn(() => Promise.resolve()),
  }),
  resetMatrixClient: jest.fn(),
}));

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAuthStore.setState({
      isLoading: false,
      isAuthenticated: false,
      session: null,
      error: null,
    });
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login('testuser', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.session).not.toBeNull();
      expect(result.current.session?.userId).toBe('@test:matrix.org');
    });
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useAuthStore());

    // Set an error
    useAuthStore.setState({ error: 'Test error' });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should logout', async () => {
    const { result } = renderHook(() => useAuthStore());

    // Set authenticated state
    useAuthStore.setState({
      isAuthenticated: true,
      session: {
        accessToken: 'test',
        userId: '@test:matrix.org',
        deviceId: 'DEVICE123',
        homeserver: 'https://matrix.org',
      },
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });
});
