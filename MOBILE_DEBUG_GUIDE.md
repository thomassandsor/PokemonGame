# Mobile Authentication Debug Guide

This guide will help you debug mobile authentication issues using the comprehensive debugging tools added to the Pokémon Game.

## Quick Access to Debug Tools

### Method 1: Floating Debug Button
- The debug button (🔧) appears automatically when:
  - On mobile devices
  - Authentication parameters are present in URL
  - Page appears to be stuck/blank with minimal content
  - MSAL authentication data exists in storage
- Located in bottom-right corner of the screen
- Tap to open the mobile debug panel

### Method 2: Keyboard Shortcut (Any Device)
- Press **Ctrl+Shift+D** to force the debug panel to appear
- Works even when the button is not visible
- Useful when stuck on white screens

### Method 3: Browser Console (Emergency Access)
- Open browser developer tools (F12)
- In console, type: `showMobileDebug()`
- This will force the debug panel to appear
- Type `hideMobileDebug()` to hide it

### Method 4: URL Parameter (Any Device)
- Add `?debug=mobile` to any URL to show the floating debug button
- Example: `https://your-app.com/login?debug=mobile`

### Method 5: Admin Portal (After Login)
1. Navigate to `/admin` after logging in
2. Click "📱 Show Mobile Debug" button
3. View comprehensive debug information

## Debug Features Available

### Device Information
- Device type detection (iOS, Android, Desktop)
- Browser identification (Safari, Chrome, etc.)
- Screen and viewport dimensions
- Storage availability (localStorage, sessionStorage)
- Cookie support status
- Private/Incognito mode detection

### Authentication Status
- Account count and active account info
- MSAL instance state
- Cache location and contents
- Authentication flow tracking

### Interactive Debug Tools
- **Test Login**: Trigger a manual login attempt
- **Log Auth State**: Capture current authentication state
- **Clear Auth Cache**: Remove all MSAL cache data
- **Refresh Logs**: Update debug log display
- **Clear Logs**: Reset debug log history

### Debug Logs
- Timestamped log entries
- MSAL event tracking
- Authentication flow details
- Error messages and stack traces
- Device-specific information

## Mobile Authentication Troubleshooting Steps

### Step 1: Check Device Compatibility
1. Open debug panel
2. Verify device type is correctly detected
3. Check if private mode is detected
4. Ensure localStorage and sessionStorage are available

### Step 2: Clear Cache and Test
1. Use "Clear Auth Cache" button
2. Refresh the page
3. Attempt login again
4. Monitor debug logs for errors

### Step 3: Monitor Authentication Flow
1. Before login attempt, clear logs
2. Start login process
3. Watch real-time MSAL events in debug panel
4. Look for error patterns or timeouts

### Step 4: Check Environment Variables
1. Review Environment Information section
2. Verify API_BASE_URL is correct
3. Check CLIENT_ID and AUTHORITY values
4. Ensure REDIRECT_URI matches current domain

## Common Mobile Issues and Solutions

### Issue: Blank Screen After Login
**Symptoms**: Page goes blank after successful authentication
**Debug Steps**:
1. Check logs for navigation errors
2. Verify redirect URI matches current URL
3. Look for JavaScript errors in console
4. Check if accounts are being stored properly

### Issue: Login Loop
**Symptoms**: Repeatedly redirected to login page
**Debug Steps**:
1. Check if private mode is interfering
2. Verify cache location (should be localStorage on mobile)
3. Clear auth cache and test
4. Monitor MSAL events for token acquisition failures

### Issue: Authentication Timeout
**Symptoms**: Login process never completes
**Debug Steps**:
1. Check network connectivity
2. Verify timeout values (mobile uses longer timeouts)
3. Look for popup blocking issues
4. Monitor for iframe loading errors

## EMERGENCY ACCESS - If Stuck in Login Loop

### NEW: Emergency Console Commands

If you're stuck in an infinite login loop and can't access the normal debug tools, you can use these emergency commands:

**Open Browser Developer Tools (F12) and in the Console tab, type:**

```javascript
// Emergency debug access - shows full debug overlay
emergencyDebug()

// Emergency stop - clears auth state and redirects to login
emergencyStop()

// Nuclear option - clears ALL authentication data
clearAllAuth()
```

These commands are available **immediately** when the page loads, even during login loops.

### Application Insights Logging

The app now automatically sends detailed logs to **Azure Application Insights** for remote debugging:

- **All authentication events** are logged with timing information
- **MSAL initialization attempts** and failures are tracked
- **White screen issues** are automatically detected and logged
- **Emergency tool usage** is tracked for analysis
- **Device and browser information** is included with all logs

This means even if you can't access the browser console on mobile, all the debug information is being captured in the cloud for analysis.

## Critical Mobile Issue: White Screen After Authentication

### Root Cause Identified: MSAL Initialization Loop

**The Problem**: The logs you provided show the exact cause of the white screen issue:
```
MSAL 2: Info - initialize has already been called, exiting early.
[Multiple rapid-fire initializations within milliseconds]
```

This indicates that MSAL is being initialized multiple times in rapid succession, causing an infinite loop that prevents the app from properly loading after authentication.

### Issue: Stuck on White Screen After Login
**Symptoms**: 
- Login process starts successfully
- User completes authentication with Microsoft
- Browser shows white/blank screen instead of redirecting to app
- Page appears to be loading indefinitely
- Debug console shows repeated "initialize has already been called" messages
- Debug tools may still be accessible

**Root Cause**: Multiple MSAL instance initialization attempts, especially on mobile devices where React.StrictMode and component re-rendering can trigger multiple initializations.

### Latest Fix Applied

The app now uses a **window-level singleton pattern** to prevent multiple MSAL initializations:

1. **Global Instance Storage**: MSAL instance is stored on the window object
2. **Initialization Guard**: Prevents multiple initialization attempts
3. **Timing Tracking**: Logs initialization and redirect timing to help debug
4. **Double-Mount Prevention**: Prevents React.StrictMode from causing issues

### Technical Details of the Fix

The fix involves several key changes to prevent MSAL initialization loops:

1. **Window-Level Singleton Pattern**:
   ```javascript
   // Instead of module-level variables that can be reset
   const MSAL_INSTANCE_KEY = '_pokemonGameMsalInstance';
   window[MSAL_INSTANCE_KEY] = msalInstance;
   ```

2. **Initialization Guard**:
   ```javascript
   if (window[MSAL_INIT_KEY]) {
     throw new Error('MSAL is already initializing - preventing duplicate initialization');
   }
   ```

3. **Timing and Debug Logging**:
   - Tracks initialization and redirect timing
   - Logs detailed authentication flow information
   - Provides clear success/failure indicators

4. **React.StrictMode Protection**:
   - Prevents double-mounting of the React app
   - Checks for existing DOM children before rendering

5. **Mobile-Specific Timeout Handling**:
   - Shorter authentication timeouts (5s mobile, 3s desktop)
   - Prevents 30-second authentication hangs

### New Debug Information to Look For

When checking the logs, look for these new messages:

**Good Signs (Fixed)**:
```
🔄 Starting MSAL initialization sequence...
🆕 Creating new global MSAL instance
✅ MSAL initialized successfully in XXXms
✅ Redirect promise handled in XXXms total
📱 MOBILE DEBUG: Redirect successful, user should be logged in
```

**Bad Signs (Still Issues)**:
```
⚠️ Root element already has children, skipping render to prevent double-mount
⏳ MSAL is already initializing globally, throwing error to prevent loop
```

### This is the most common mobile authentication issue - here's how to debug it:

### If the Initialization Loop Issue Persists

If you still see repeated initialization messages after the fix:

1. **Clear All Browser Data**: 
   - Clear cookies, cache, and stored data
   - Close all browser tabs
   - Restart the browser completely

2. **Check for Module Hot-Reloading Issues**:
   - If in development mode, try a production build
   - Disable browser extensions that might interfere
   - Try a different browser or incognito mode

3. **Force Single Instance**:
   - Look for the message "🔄 Reusing existing global MSAL instance"
   - This means the singleton is working correctly

4. **Monitor Initialization Timing**:
   - Look for initialization times in the logs
   - If you see multiple "Starting MSAL initialization sequence..." messages, the issue persists

5. **Check React.StrictMode Impact**:
   - The app should now handle StrictMode properly
   - Look for "Root element already has children" messages

#### Step 1: Access Debug Panel When Stuck on White Screen
**CRITICAL**: The debug button should now be visible even on white screens. If not:

1. **First Try**: Look for the floating debug button (🔧) - it should appear automatically when authentication issues are detected
2. **Second Try**: Press **Ctrl+Shift+D** on your keyboard to force the debug panel to appear
3. **Third Try**: Open browser developer tools (if available) and type `showMobileDebug()` in the console
4. **Last Resort**: Add `?debug=mobile` to the current URL and refresh

#### Step 2: Use the Diagnose Button
1. Once debug panel is open, click **"🔍 Diagnose White Screen"** button
2. Look for the red alert box that shows the specific cause
3. The diagnosis will tell you exactly what's failing

#### Step 2: Check MSAL Authentication State
1. After getting stuck on white screen, open debug panel
2. Click "Log Auth State" button
3. Check if:
   - Accounts are being stored (should show > 0 accounts)
   - Active account is set
   - Tokens are present in cache
4. If accounts exist but page is still white, this indicates a navigation/redirect issue

#### Step 3: Monitor Browser Console
1. Open browser developer tools (if available on mobile)
2. Check Console tab for JavaScript errors
3. Look for errors related to:
   - Navigation failures
   - React routing issues
   - MSAL redirect promise handling
   - Cross-origin or CORS errors

#### Step 4: Test Manual Navigation
1. While stuck on white screen, manually navigate to `/my-page`
2. If this works, the issue is redirect handling after authentication
3. If this doesn't work, the issue is authentication state persistence

### Advanced Debugging for White Screen Issue:

#### Test Different Authentication Methods:
1. **Clear Cache Completely**:
   - Use "Clear Auth Cache" in debug panel
   - Clear browser cache manually
   - Close and reopen browser
   - Try authentication again

2. **Test Different Browser Modes**:
   - Regular browsing mode
   - Private/Incognito mode (note: may have different behavior)
   - Different mobile browsers (Safari, Chrome, Edge)

3. **Monitor Redirect Flow**:
   - Watch URL changes during authentication
   - Note if URL contains authentication parameters after login
   - Check if redirect URI matches current domain

#### Common Causes and Solutions:

**Cause 1: MSAL Redirect Promise Not Handled**
- **Symptoms**: Authentication succeeds but app doesn't navigate
- **Solution**: Check that `msalInstance.handleRedirectPromise()` is completing
- **Debug**: Look for "Redirect response received" in logs

**Cause 2: React Router Navigation Issues**
- **Symptoms**: Authentication succeeds but routing fails
- **Solution**: Check React Router configuration and protected routes
- **Debug**: Manually test navigation to protected routes

**Cause 3: Token Storage Issues on Mobile**
- **Symptoms**: Authentication appears to succeed but tokens aren't persisted
- **Solution**: Verify localStorage/sessionStorage availability
- **Debug**: Check storage availability in Device Information section

**Cause 4: Private Mode Interference**
- **Symptoms**: Works in normal mode but fails in private browsing
- **Solution**: Enhanced private mode handling may be needed
- **Debug**: Compare behavior between normal and private modes

**Cause 5: Network/Timing Issues**
- **Symptoms**: Intermittent failures, especially on slower connections
- **Solution**: May need longer timeouts or retry logic
- **Debug**: Check response times in API health section

#### Specific Mobile Browser Issues:

**Safari iOS**:
- May have stricter popup blocking
- LocalStorage behavior differs in private mode
- Cross-origin restrictions may apply

**Chrome Android**:
- Generally more permissive
- Better debugging tools available
- May handle redirects differently

**In-App Browsers** (Facebook, Instagram, etc.):
- Limited JavaScript capabilities
- May block certain authentication flows
- Often require fallback authentication methods

### Recovery Steps:

If stuck on white screen:
1. **Don't refresh immediately** - capture debug logs first
2. Use debug panel to export current state
3. Try manual navigation to `/login` or `/my-page`
4. If manual navigation works, clear auth cache and retry
5. If nothing works, clear all browser data and start fresh

## Support Information

If you encounter persistent issues:
1. Export debug logs using browser developer tools
2. Include device information from debug panel
3. Note specific error messages and timestamps
4. Include browser and OS versions

The debug tools provide comprehensive information to diagnose mobile authentication issues effectively.
