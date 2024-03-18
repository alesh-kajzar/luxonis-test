module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // If your files are in a specific directory, specify here:
    roots: ['<rootDir>/src'],
    testMatch: [
      '**/test/**/test*.ts?(x)',
    ]
  };