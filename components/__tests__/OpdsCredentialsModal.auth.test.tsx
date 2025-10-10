import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import OpdsCredentialsModal from '../OpdsCredentialsModal';

describe('OpdsCredentialsModal authDocument rendering', () => {
  it('renders authDocument fields', () => {
    const authDoc = {
      title: 'Library card',
      description: 'Enter your library card number and PIN.',
      logo: 'https://example.org/logo.png',
      links: [{ href: 'https://example.org/auth', rel: 'authenticate', title: 'Sign in' }],
      username_hint: 'library-card-number',
      password_hint: '4-digit PIN',
      username_placeholder: 'Card number',
      password_placeholder: 'PIN'
    };

    render(<OpdsCredentialsModal isOpen={true} host={'minotaur.dev'} authDocument={authDoc} onClose={() => {}} onSubmit={() => {}} />);

    expect(screen.getByText(/Login to Library card|Authentication required/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter your library card number and PIN./i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Card number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('PIN')).toBeInTheDocument();
    expect(screen.getByText(/Sign in/)).toBeInTheDocument();
  });
});
