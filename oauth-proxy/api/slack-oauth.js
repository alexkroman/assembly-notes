// Helper function to escape HTML entities
function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET requests (OAuth callback from Slack)
  if (req.method === 'GET') {
    // This is the OAuth callback - show a success page
    const { code, error } = req.query;

    if (error) {
      // Escape the error message to prevent XSS
      const safeError = escapeHtml(error);
      return res.status(200).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>❌ OAuth Error</h1>
            <p>Error: ${safeError}</p>
            <p>Please close this window and try again.</p>
          </body>
        </html>
      `);
    }

    if (code) {
      // Don't include the code in the HTML at all - the Electron app intercepts before page loads
      return res.status(200).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>✅ Successfully connected to Slack!</h1>
            <p>You can close this window and return to Assembly Notes.</p>
            <script>
              // Try to close the window
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    }

    return res.status(400).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Invalid Request</h1>
          <p>No authorization code or error received.</p>
        </body>
      </html>
    `);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Support both JSON and form-urlencoded
  const contentType = req.headers['content-type'] || '';
  let code, client_id, redirect_uri;

  if (contentType.includes('application/json')) {
    ({ code, client_id, redirect_uri } = req.body);
  } else {
    ({ code, client_id, redirect_uri } = req.body);
  }

  if (!code || !client_id) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Exchange code for token with Slack
    // Ensure the secret is trimmed of any whitespace
    const clientSecret = process.env.SLACK_CLIENT_SECRET?.trim();

    if (!clientSecret) {
      console.error('SLACK_CLIENT_SECRET is not set or empty!');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const params = new URLSearchParams({
      client_id,
      client_secret: clientSecret,
      code,
      redirect_uri:
        redirect_uri ||
        'https://assembly-notes.alexkroman.com/auth/slack/callback',
    });

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Slack OAuth error:', data);
      return res
        .status(400)
        .json({ error: data.error || 'OAuth exchange failed' });
    }

    // Return the OAuth response
    return res.status(200).json({
      ok: true,
      access_token: data.access_token,
      scope: data.scope,
      team: data.team,
      bot_user_id: data.bot_user_id,
    });
  } catch (error) {
    console.error('OAuth proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
