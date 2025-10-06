/**
 * Mock Logger
 */

export const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    emoji: jest.fn(),
    group: jest.fn(),
    groupEnd: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
    table: jest.fn(),
};
