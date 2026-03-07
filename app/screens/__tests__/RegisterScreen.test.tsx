import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RegisterScreen from '../RegisterScreen';

describe('RegisterScreen', () => {
  it('renders title and subtitle correctly', () => {
    const { getByText } = render(<RegisterScreen />);
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Join thousands of smart note takers')).toBeTruthy();
  });

  it('renders name, email, and password inputs', () => {
    const { getByTestId } = render(<RegisterScreen />);
    expect(getByTestId('name-input')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
  });

  it('renders create account button', () => {
    const { getByTestId } = render(<RegisterScreen />);
    expect(getByTestId('register-button')).toBeTruthy();
  });

  it('renders sign in navigation link', () => {
    const { getByTestId } = render(<RegisterScreen />);
    expect(getByTestId('login-link')).toBeTruthy();
  });

  it('calls onNavigateToLogin when sign in link is pressed', () => {
    const mockNavigate = jest.fn();
    const { getByTestId } = render(<RegisterScreen onNavigateToLogin={mockNavigate} />);
    fireEvent.press(getByTestId('login-link'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('updates name input value', () => {
    const { getByTestId } = render(<RegisterScreen />);
    const nameInput = getByTestId('name-input');
    fireEvent.changeText(nameInput, 'John Doe');
    expect(nameInput.props.value).toBe('John Doe');
  });

  it('updates email input value', () => {
    const { getByTestId } = render(<RegisterScreen />);
    const emailInput = getByTestId('email-input');
    fireEvent.changeText(emailInput, 'john@example.com');
    expect(emailInput.props.value).toBe('john@example.com');
  });
});
