import db from './db.js';

// Mock request and response objects
const mockReq = {};
const mockRes = {
  json: (data) => {
    console.log('Response data:', JSON.stringify(data, null, 2));
  },
  status: (code) => {
    console.log('Response status:', code);
    return mockRes;
  }
};

// Import the controller functions
import { getOstaData, getFstaData } from './controllers/projectController.js';

async function testOstaFstaAPI() {
  console.log('Testing OSTA data fetch:');
  try {
    await getOstaData(mockReq, mockRes);
  } catch (error) {
    console.error('Error testing OSTA data fetch:', error);
  }
  
  console.log('\nTesting FSTA data fetch:');
  try {
    await getFstaData(mockReq, mockRes);
  } catch (error) {
    console.error('Error testing FSTA data fetch:', error);
  }
}

testOstaFstaAPI();