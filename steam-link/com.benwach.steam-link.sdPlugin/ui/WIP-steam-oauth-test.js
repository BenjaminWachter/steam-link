
let windowObjectReference = null;
let previousUrl = null;
const streamDeckClient = window.SDPIComponents?.streamDeckClient;

const OAUTH_SERVER_ORIGIN = 'http://localhost:3000';
const OAUTH_START_URL = `${OAUTH_SERVER_ORIGIN}/auth/steam`;
const OAUTH_HEALTH_URL = `${OAUTH_SERVER_ORIGIN}/health`;

const receiveMessage = (event) => {
  if (event.origin !== OAUTH_SERVER_ORIGIN) {
    return;
  }

  const { data } = event ?? {};
  if (!data || data.source !== 'steam-oauth') {
    return;
  }

  const { payload } = data;
  console.log('Steam OAuth success payload:', payload);
};

const openSignInWindow = (url, name) => {
  window.removeEventListener('message', receiveMessage);

  const strWindowFeatures = 'toolbar=no, menubar=no, width=600, height=700, top=100, left=100';

  if (windowObjectReference === null || windowObjectReference.closed) {
    windowObjectReference = window.open(url, name, strWindowFeatures);
  } else if (previousUrl !== url) {
    windowObjectReference = window.open(url, name, strWindowFeatures);
    windowObjectReference.focus();
  } else {
    windowObjectReference.focus();
  }

  window.addEventListener('message', receiveMessage, false);
  previousUrl = url;
};

const openOAuthStart = async () => {
  try {
    const response = await fetch(OAUTH_HEALTH_URL, { method: 'GET' });
    if (!response.ok) {
      console.error('OAuth server health check failed:', response.status);
      return;
    }
  } catch (error) {
    console.error('OAuth server is not reachable. Start it with: npm run oauth:test', error);
    return;
  }

  if (streamDeckClient) {
    // Most reliable way to open URLs from Stream Deck Property Inspector
    streamDeckClient.send('openUrl', { url: OAUTH_START_URL });
    return;
  }

  // Fallback for non-SDPI contexts
  openSignInWindow(OAUTH_START_URL, 'Steam Sign-In');
};

const testButton = document.getElementById('testOAuthButton');
if (testButton) {
  testButton.addEventListener('click', openOAuthStart);
  testButton.addEventListener('valuechange', openOAuthStart);
}
