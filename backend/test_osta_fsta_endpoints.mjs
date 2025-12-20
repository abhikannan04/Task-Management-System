import express from 'express';
import { getOstaData, getFstaData } from './controllers/projectController.js';

// Create a mock request and response object for testing
const mockReq = {};
const mockRes = {
  json: function(data) {
    console.log('JSON Response:', JSON.stringify(data, null, 2));
    return this;
  },
  status: function(code) {
    console.log('Status Code:', code);
    return this;
  }
};

async function testEndpoints() {
  console.log('Testing OSTA endpoint:');
  try {
    await getOstaData(mockReq, mockRes);
  } catch (error) {
    console.error('Error testing OSTA endpoint:', error);
  }
  
  console.log('\nTesting FSTA endpoint:');
  try {
    await getFstaData(mockReq, mockRes);
  } catch (error) {
    console.error('Error testing FSTA endpoint:', error);
  }
}

testEndpoints();