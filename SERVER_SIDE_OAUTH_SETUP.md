# Server-Side OAuth Setup Guide

## Overview
This guide helps you set up **server-side OAuth** with Google and Microsoft. This approach eliminates all the mobile authentication issues you were experiencing with client-side MSAL.

## Benefits of Server-Side OAuth
✅ **Works on ALL devices** - No mobile browser issues  
✅ **Real email verification** - OAuth providers verify emails  
✅ **Real names** - Get verified user names for seminars  
✅ **No JavaScript complexity** - Server handles everything  
✅ **Better security** - Secrets stay on server  

## Authentication Flow
1. User clicks "Login with Google/Microsoft" on `/login.html`
2. User is redirected to Google/Microsoft login page
3. User logs in with their real account
4. Google/Microsoft redirects back to your server with verified email/name
5. Your server creates a session and redirects to `/game.html`
6. Game loads with verified user information

## Setup Steps

### 1. Google OAuth Setup

#### A. Create Google OAuth Application
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the **Google+ API** (or People API)
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Choose **Web application**
6. Set **Authorized redirect URIs**:
   - `https://red-forest-0b2b6ae03.1.azurestaticapps.net/api/GoogleCallback`
   - `http://localhost:7071/api/GoogleCallback` (for local testing)

#### B. Configure Environment Variables
Add to your `.env` file:
```bash
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=https://red-forest-0b2b6ae03.1.azurestaticapps.net/api/GoogleCallback
```

### 2. Microsoft OAuth Setup (REUSE EXISTING)

✅ **Good news!** You already have a Microsoft Azure AD app registration configured.

#### A. Update Your Existing Azure AD App
You already have:
- **Client ID**: `f401ee29-ec81-479c-a310-73514915c056`
- **Authority**: `https://login.microsoftonline.com/consumers`

Just need to add the new redirect URI:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your existing app: `f401ee29-ec81-479c-a310-73514915c056`
4. Go to **Authentication** → **Add a platform** → **Web**
5. Add redirect URI: `https://red-forest-0b2b6ae03.1.azurestaticapps.net/api/MicrosoftCallback`
6. **Keep your existing redirect URI** for the React app: `https://red-forest-0b2b6ae03.1.azurestaticapps.net`

#### B. Get Client Secret (if you don't have it)
1. Go to **Certificates & secrets**
2. If you don't have an active client secret, create one: **New client secret**
3. Copy the **client secret value**

#### C. Configure Environment Variables
Add to your `.env` file (using your existing values):
```bash
MICROSOFT_CLIENT_ID=f401ee29-ec81-479c-a310-73514915c056
MICROSOFT_CLIENT_SECRET=your-existing-client-secret-here
MICROSOFT_REDIRECT_URI=https://red-forest-0b2b6ae03.1.azurestaticapps.net/api/MicrosoftCallback
MICROSOFT_TENANT_ID=consumers
```

### 3. General Configuration

Add to your `.env` file:
```bash
GAME_URL=https://red-forest-0b2b6ae03.1.azurestaticapps.net/game.html
```

## Local Testing

For local development, use these redirect URIs:
- Google: `http://localhost:7071/api/GoogleCallback`
- Microsoft: `http://localhost:7071/api/MicrosoftCallback`

And set:
```bash
GOOGLE_REDIRECT_URI=http://localhost:7071/api/GoogleCallback
MICROSOFT_REDIRECT_URI=http://localhost:7071/api/MicrosoftCallback
GAME_URL=http://localhost:3000/game.html
```

## Deployment

1. **Update your environment variables** in Azure Functions:
   - Go to Azure Portal → Function Apps → `pokemongame-functions-2025`
   - Navigate to **Configuration** → **Application settings**
   - Add all the OAuth environment variables:
     ```
     MICROSOFT_CLIENT_ID=f401ee29-ec81-479c-a310-73514915c056
     MICROSOFT_CLIENT_SECRET=your-client-secret
     MICROSOFT_REDIRECT_URI=https://red-forest-0b2b6ae03.1.azurestaticapps.net/api/MicrosoftCallback
     MICROSOFT_TENANT_ID=consumers
     
     GOOGLE_CLIENT_ID=your-google-client-id
     GOOGLE_CLIENT_SECRET=your-google-client-secret
     GOOGLE_REDIRECT_URI=https://red-forest-0b2b6ae03.1.azurestaticapps.net/api/GoogleCallback
     
     GAME_URL=https://red-forest-0b2b6ae03.1.azurestaticapps.net/game.html
     ```

2. **Deploy your functions**:
   ```bash
   cd api
   func azure functionapp publish pokemongame-functions-2025
   ```

3. **Deploy your static app** (automatic via GitHub Actions)

## Security Notes

- ✅ Client secrets are stored securely on server
- ✅ OAuth flows happen server-side
- ✅ Users get verified emails and real names
- ✅ Sessions use secure HTTP-only cookies
- ✅ No sensitive data in browser JavaScript

## Testing Your Setup

1. Navigate to `/login.html`
2. Click "Continue with Google" or "Continue with Microsoft"
3. Complete OAuth login
4. You should be redirected to `/game.html` with user info displayed
5. Check `/api/WhoAmI` endpoint to verify user data

## Troubleshooting

**OAuth Error**: Check your redirect URIs match exactly  
**No user data**: Verify API permissions are granted  
**Local testing issues**: Make sure you're using localhost URLs in development  
**Server errors**: Check Azure Functions logs for detailed error messages

## What This Solves

❌ **Before**: Complex client-side MSAL + mobile browser issues  
✅ **After**: Simple server-side OAuth + works everywhere  

❌ **Before**: Fake email addresses  
✅ **After**: OAuth-verified real emails  

❌ **Before**: Manual user creation  
✅ **After**: Self-service with verified identity  

❌ **Before**: Mobile authentication loops  
✅ **After**: Perfect mobile compatibility  

Your seminar attendees will now have a smooth, reliable login experience on all devices!
