module.exports = {
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
};
