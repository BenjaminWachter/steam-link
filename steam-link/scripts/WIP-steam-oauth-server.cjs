const express = require('express');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const session = require('express-session');

const PORT = process.env.STEAM_OAUTH_PORT || 3000;
const BASE_URL = process.env.STEAM_OAUTH_BASE_URL || `http://localhost:${PORT}`;
const RETURN_URL = `${BASE_URL}/auth/steam/return`;
const REALM = `${BASE_URL}/`;
const API_KEY = process.env.STEAM_API_KEY;

if (!API_KEY) {
  console.warn('Missing STEAM_API_KEY environment variable.');
  console.warn('OAuth server will still start for /health checks, but Steam auth routes are disabled.');
  console.warn('Get one at https://steamcommunity.com/dev/apikey and run:');
  console.warn('  set STEAM_API_KEY=your_key_here   (cmd)');
  console.warn('  $env:STEAM_API_KEY="your_key_here" (PowerShell)');
}

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET || 'steam-link-oauth-dev-secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

if (API_KEY) {
  passport.use(new SteamStrategy(
    {
      returnURL: RETURN_URL,
      realm: REALM,
      apiKey: API_KEY
    },
    (identifier, profile, done) => {
      process.nextTick(() => {
        profile.identifier = identifier;
        return done(null, profile);
      });
    }
  ));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, baseUrl: BASE_URL, hasApiKey: Boolean(API_KEY) });
});

app.get('/auth/steam', (req, res, next) => {
  if (!API_KEY) {
    return res.status(503).send('Missing STEAM_API_KEY. Set it and restart oauth:test server.');
  }
  return passport.authenticate('steam', { failureRedirect: '/auth/error' })(req, res, next);
});

app.get(
  '/auth/steam/return',
  (req, res, next) => {
    if (!API_KEY) {
      return res.status(503).send('Missing STEAM_API_KEY. Set it and restart oauth:test server.');
    }
    return passport.authenticate('steam', { failureRedirect: '/auth/error' })(req, res, next);
  },
  (req, res) => {
    const profile = req.user || {};
    const steamId = profile.id || profile._json?.steamid || null;

    const payload = {
      source: 'steam-oauth',
      payload: {
        steamId,
        identifier: profile.identifier || null,
        displayName: profile.displayName || null
      }
    };

    res.send(`<!doctype html>
<html>
  <body>
    <script>
      (function () {
        var message = ${JSON.stringify(payload)};
        if (window.opener) {
          window.opener.postMessage(message, '*');
        }
        window.close();
      })();
    </script>
    Steam auth complete. You can close this window.
  </body>
</html>`);
  }
);

app.get('/auth/error', (_req, res) => {
  res.status(401).send('Steam authentication failed.');
});

app.listen(PORT, () => {
  console.log(`Steam OAuth test server running at ${BASE_URL}`);
  console.log(`Return URL: ${RETURN_URL}`);
  console.log(`Realm: ${REALM}`);
});
