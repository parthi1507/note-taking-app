import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

describe('LoginScreen', () => {
  it('renders title and subtitle correctly', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Sign in to your notes')).toBeTruthy();
  });

  it('renders email and password inputs', () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
  });

  it('renders sign in button', () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId('login-button')).toBeTruthy();
  });

  it('renders register navigation link', () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId('register-link')).toBeTruthy();
  });

  it('calls onNavigateToRegister when register link is pressed', () => {
    const mockNavigate = jest.fn();
    const { getByTestId } = render(<LoginScreen onNavigateToRegister={mockNavigate} />);
    fireEvent.press(getByTestId('register-link'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('updates email input value', () => {
    const { getByTestId } = render(<LoginScreen />);
    const emailInput = getByTestId('email-input');
    fireEvent.changeText(emailInput, 'test@example.com');
    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('updates password input value', () => {
    const { getByTestId } = render(<LoginScreen />);
    const passwordInput = getByTestId('password-input');
    fireEvent.changeText(passwordInput, 'password123');
    expect(passwordInput.props.value).toBe('password123');
  });
});
