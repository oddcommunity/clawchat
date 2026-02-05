module.exports = {
  extends: 'expo',
  rules: {
    // Allow console statements in development
    'no-console': 'off',
    // Allow any type for now (can be stricter later)
    '@typescript-eslint/no-explicit-any': 'off',
    // Allow non-null assertions
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
};
