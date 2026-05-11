import express from 'express'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const router = express.Router()

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-modify-playback-state',
  'user-read-playback-state',
  'streaming',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read'
].join(' ')

router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
    show_dialog: true
  })
  res.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`)
})

router.get('/callback', async (req, res) => {
  const { code, error } = req.query

  if (error) {
    return res.redirect(`http://localhost:5173?error=${error}`)
  }

  try {
    const credentials = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64')

    const response = await axios.post(SPOTIFY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    const { access_token, refresh_token, expires_in } = response.data

    req.session.accessToken = access_token
    req.session.refreshToken = refresh_token
    req.session.tokenExpiry = Date.now() + expires_in * 1000

    const profile = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    })

    req.session.user = {
      id: profile.data.id,
      name: profile.data.display_name,
      image: profile.data.images?.[0]?.url || null
    }

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
        return res.redirect(`http://localhost:5173?error=session_failed`)
      }
      const userData = encodeURIComponent(JSON.stringify({
        id: req.session.user.id,
        name: req.session.user.name,
        image: req.session.user.image,
        accessToken: req.session.accessToken,
        refreshToken: req.session.refreshToken,
        tokenExpiry: req.session.tokenExpiry
      }))
      res.redirect(`http://localhost:5173/create-room?user=${userData}`)
    })

  } catch (err) {
    console.error('Spotify callback error:', err.message)
    res.redirect(`http://localhost:5173?error=auth_failed`)
  }
})

router.get('/refresh', async (req, res) => {
  if (!req.session.refreshToken) {
    return res.status(401).json({ error: 'No refresh token' })
  }

  try {
    const credentials = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64')

    const response = await axios.post(SPOTIFY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: req.session.refreshToken
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    req.session.accessToken = response.data.access_token
    req.session.tokenExpiry = Date.now() + response.data.expires_in * 1000

    res.json({ success: true })

  } catch (err) {
    console.error('Refresh error:', err.message)
    res.status(500).json({ error: 'Failed to refresh token' })
  }
})

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  res.json({ user: req.session.user })
})

router.get('/logout', (req, res) => {
  req.session.destroy()
  res.json({ success: true })
})

// guest login — opens spotify auth with limited scopes
router.get('/guest-login', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_GUEST_REDIRECT_URI,
    scope: 'playlist-read-private playlist-read-collaborative',
    show_dialog: true
  })
  res.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`)
})

// guest callback — closes popup and sends token back to parent window
router.get('/guest-callback', async (req, res) => {
  const { code, error } = req.query

  if (error) {
    return res.send(`
      <script>
        window.opener?.postMessage({ type: 'SPOTIFY_TOKEN', accessToken: null }, '*')
        window.close()
      </script>
    `)
  }

  try {
    const credentials = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64')

    const response = await axios.post(SPOTIFY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_GUEST_REDIRECT_URI
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    const { access_token } = response.data

    res.send(`
      <script>
        window.opener?.postMessage({
          type: 'SPOTIFY_TOKEN',
          accessToken: '${access_token}'
        }, '*')
        window.close()
      </script>
    `)

  } catch (err) {
    console.error('Guest callback error:', err.message)
    res.send(`
      <script>
        window.opener?.postMessage({ type: 'SPOTIFY_TOKEN', accessToken: null }, '*')
        window.close()
      </script>
    `)
  }
})

router.get('/test-playlist', async (req, res) => {
  try {
    const token = req.session.accessToken
    if (!token) return res.json({ error: 'no token - login first' })

    const response = await axios.get(
      'https://api.spotify.com/v1/playlists/4RuEr8zXWEubJy9VeiM8SO/tracks',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 5 }
      }
    )
    res.json(response.data)
  } catch (err) {
    res.json({ error: err.response?.data || err.message })
  }
})


export default router