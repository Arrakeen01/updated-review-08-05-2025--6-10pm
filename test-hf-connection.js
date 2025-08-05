// Test HuggingFace connection
import { HfInference } from '@huggingface/inference';

const API_KEY = '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';
const MODEL_ID = 'Qwen/Qwen2.5-VL-7B-Instruct';

async function testHuggingFaceConnection() {
  console.log('🔍 Testing HuggingFace connection...');
  
  if (!API_KEY) {
    console.error('❌ No API key provided');
    return false;
  }
  
  try {
    const hf = new HfInference(API_KEY);
    
    // Test simple health check
    console.log('📡 Testing API connectivity with model info...');
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${MODEL_ID}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    if (response.ok) {
      const modelInfo = await response.json();
      console.log('✅ HuggingFace API connection successful');
      console.log('📋 Model info:', modelInfo);
      return true;
    } else {
      console.error('❌ HuggingFace API connection failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ HuggingFace connection test failed:', error);
    return false;
  }
}

// Run the test
testHuggingFaceConnection()
  .then(result => {
    console.log('🏁 Test completed. Success:', result);
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
  });