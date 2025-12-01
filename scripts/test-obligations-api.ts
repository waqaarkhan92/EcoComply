/**
 * Test the obligations API endpoint directly
 */

async function main() {
  const documentId = '8b8b764d-7675-484c-ad0e-c6ffa8b6240e';

  // Test without auth (will show auth error but demonstrates flow)
  const url = `http://localhost:3000/api/v1/documents/${documentId}/obligations`;

  console.log(`📡 Calling: ${url}\n`);

  try {
    const response = await fetch(url);
    const text = await response.text();

    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Body:', text.substring(0, 500));

    if (response.ok) {
      const json = JSON.parse(text);
      console.log('\n✅ Success! Data count:', Array.isArray(json.data) ? json.data.length : 'not an array');
    } else {
      console.log('\n❌ API returned error (expected - no auth token)');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

main();
