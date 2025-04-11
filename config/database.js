const mongoose = require('mongoose');

async function dbinitialize(connectStr) {
  try {
    await mongoose.connect(connectStr);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB', error);
    throw error;
  }
}

module.exports = {
  dbinitialize,
};