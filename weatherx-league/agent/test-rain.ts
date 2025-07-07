import { getRain, getRainMultiple, hasRecentRain } from './fetchRain';

/**
 * Test file to demonstrate WeatherXM rain data functionality
 * This file shows how to use the various rain data functions
 */

async function testRainFunctions() {
  console.log('🌧️  Testing WeatherXM Rain Data Functions\n');

  // Test 1: Get rain data for a single station
  console.log('1. Testing getRain() with a single station ID:');
  try {
    const stationId = 'example-station-id'; // Replace with actual station ID
    const rainData = await getRain(stationId);
    
    console.log('   Result:', JSON.stringify(rainData, null, 2));
    
    if (rainData.success) {
      console.log(`   ✅ Success: ${rainData.precipitationMm}mm of rain at ${rainData.timestamp}`);
    } else {
      console.log(`   ❌ Error: ${rainData.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error}`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Get rain data for multiple stations
  console.log('2. Testing getRainMultiple() with multiple station IDs:');
  try {
    const stationIds = ['station-1', 'station-2', 'station-3']; // Replace with actual station IDs
    const rainDataArray = await getRainMultiple(stationIds);
    
    console.log('   Results:');
    rainDataArray.forEach((rainData, index) => {
      console.log(`   Station ${index + 1} (${rainData.stationId}):`);
      if (rainData.success) {
        console.log(`     ✅ ${rainData.precipitationMm}mm at ${rainData.timestamp}`);
      } else {
        console.log(`     ❌ Error: ${rainData.error}`);
      }
    });
  } catch (error) {
    console.log(`   ❌ Exception: ${error}`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Check for recent rain
  console.log('3. Testing hasRecentRain() with threshold:');
  try {
    const stationId = 'example-station-id'; // Replace with actual station ID
    const thresholdMm = 0.5; // 0.5mm threshold
    
    const hasRain = await hasRecentRain(stationId, thresholdMm);
    
    console.log(`   Station: ${stationId}`);
    console.log(`   Threshold: ${thresholdMm}mm`);
    console.log(`   Has recent rain: ${hasRain ? '✅ Yes' : '❌ No'}`);
  } catch (error) {
    console.log(`   ❌ Exception: ${error}`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Using with Express API endpoints
  console.log('4. Example API endpoint usage:');
  console.log('   After running the agent server, you can test these endpoints:');
  console.log('   GET  /agent/rain/your-station-id');
  console.log('   POST /agent/rain/multiple');
  console.log('        Body: { "stationIds": ["station-1", "station-2"] }');
  console.log('   GET  /agent/rain/your-station-id/recent?threshold=0.5');
  console.log('');
  console.log('   Or use the generic process endpoint:');
  console.log('   POST /agent/process');
  console.log('        Body: { "action": "get_rain", "data": { "stationId": "your-station-id" } }');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRainFunctions().catch(console.error);
}

export { testRainFunctions }; 