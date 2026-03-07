export interface User {
  uid: string;
  email: string;
  displayName: string | null;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  displayName: string;
}
