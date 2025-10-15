import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
vi.mock('../../services/google', () => ({
  revokeToken: vi.fn(),
  initGoogleClient: vi.fn(() => Promise.resolve({ requestAccessToken: vi.fn() })),
}));

// Helper component to test useAuth
const Consumer: React.FC = () => {
  const { user, isLoggedIn, signIn, signOut, isInitialized } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <span data-testid="logged-in">{isLoggedIn ? 'yes' : 'no'}</span>
      <span data-testid="initialized">{isInitialized ? 'yes' : 'no'}</span>
      <button onClick={signIn}>Sign In</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('throws if useAuth is used outside provider', () => {
    // Suppress error boundary output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
    expect(() => render(<Consumer />)).toThrow(/useAuth must be used within an AuthProvider/);
    spy.mockRestore();
  });

  it('provides default values and renders children', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('logged-in')).toHaveTextContent('no');
    // isInitialized will be set async, so may be 'no' at first
  });

  it('calls signOut and clears localStorage', () => {
    // Set up a fake token and sync data
    localStorage.setItem('g_access_token', 'fake');
    localStorage.setItem('ebook-reader-drive-folder-id', 'folder');
    localStorage.setItem('ebook-reader-drive-file-id', 'file');
    localStorage.setItem('ebook-reader-last-sync', 'now');
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    act(() => {
      screen.getByText('Sign Out').click();
    });
    expect(localStorage.getItem('g_access_token')).toBeNull();
    expect(localStorage.getItem('ebook-reader-drive-folder-id')).toBeNull();
    expect(localStorage.getItem('ebook-reader-drive-file-id')).toBeNull();
    expect(localStorage.getItem('ebook-reader-last-sync')).toBeNull();
  });
});
