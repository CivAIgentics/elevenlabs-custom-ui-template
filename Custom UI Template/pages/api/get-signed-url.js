export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'agent_8601k89mc91repq8xd2zg2brmkkq';
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('ELEVENLABS_API_KEY not found in environment');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    console.log('Generating signed URL for agent:', agentId);
    
    // Call ElevenLabs API to get signed URL
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Failed to get signed URL',
        details: errorText 
      });
    }

    const data = await response.json();
    console.log('Successfully generated signed URL');
    
    return res.status(200).json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
