module.exports = {
  semi: true,
  trailingComma: 'none',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'avoid',
  endOfLine: 'auto',
  overrides: [
    {
      files: '*.feature',
      options: {
        parser: 'gherkin',
        printWidth: 80
      }
    }
  ]
};
