const path = require('path');

module.exports = {
  entry: {
    background: './background.js',
    content: './content.js',
    sidebar: './sidebar.js',
    devtools: './devtools.js'
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js'
  },
  watch: true
}