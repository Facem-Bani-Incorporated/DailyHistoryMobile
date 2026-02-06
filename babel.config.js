module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Plugin-ul de router trebuie să fie prezent
      'expo-router/babel',
    ],
  };
};