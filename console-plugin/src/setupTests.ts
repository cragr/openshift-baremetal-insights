import '@testing-library/jest-dom';

// Mock consoleFetchJSON for tests
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  consoleFetchJSON: jest.fn(),
  useActivePerspective: () => ['admin', jest.fn()],
}));
