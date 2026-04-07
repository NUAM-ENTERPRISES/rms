const axios = require('axios');

async function testLogin() {
  try {
    console.log('Attempting login with +91 9999999999...');
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      countryCode: '+91',
      mobileNumber: '9999999999',
      password: 'password123'
    });
    console.log('Success:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log('Error Status:', error.response.status);
      console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error Message:', error.message);
    }
  }
}

testLogin();
