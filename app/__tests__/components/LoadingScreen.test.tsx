import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoadingScreen from '../../components/LoadingScreen';

describe('LoadingScreen', () => {
  it('renders with default message', () => {
    render(<LoadingScreen />);

    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('renders with custom message', () => {
    render(<LoadingScreen message="Please wait..." />);

    expect(screen.getByText('Please wait...')).toBeTruthy();
  });

  it('renders the logo emoji', () => {
    render(<LoadingScreen />);

    expect(screen.getByText('🐾')).toBeTruthy();
  });
});
