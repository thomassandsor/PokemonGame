# Frontend Configuration for Separate Azure Functions

## Environment Variables to Add

Create/update these in your Azure Static Web Apps configuration:

```bash
# Production environment variables
REACT_APP_API_BASE_URL=https://[your-function-app-name].azurewebsites.net
```

## Code Changes Needed

### 1. Update API Base URL Configuration

In your service files, change from relative URLs to the environment variable:

```typescript
// Before (relative to Static Web Apps)
const API_BASE = '/api'

// After (pointing to separate Functions app)
const API_BASE = process.env.REACT_APP_API_BASE_URL || '/api'
```

### 2. Update Service Files

Files that may need the API_BASE update:
- `src/services/dataverseService.ts`
- `src/services/battleChallengeService.ts` 
- `src/services/portalSettingsService.ts`
- Any other files making API calls

### 3. CORS Headers

Your existing Functions already have CORS configured in `host.json`:
```json
{
  "Host": {
    "CORS": "*"
  }
}
```

This will be updated to specific origins in Azure Portal.

## Testing

1. **Local Development**: Still uses `/api` (relative)
2. **Production**: Uses `https://[function-app].azurewebsites.net/api`

## Deployment Workflow

1. Deploy Functions to standalone Azure Functions app
2. Update Static Web Apps environment variables  
3. Redeploy frontend (will pick up new API URL)
4. Test end-to-end integration
