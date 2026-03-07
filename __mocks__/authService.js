module.exports = {
  loginUser: jest.fn(() => Promise.resolve({ uid: 'test-uid', email: 'test@test.com' })),
  registerUser: jest.fn(() => Promise.resolve({ uid: 'test-uid', email: 'test@test.com' })),
  logoutUser: jest.fn(() => Promise.resolve()),
};
