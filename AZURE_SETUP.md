# Pokemon Game - Azure Setup Guide

## 🔐 Azure External Identities Setup

### 1. Create External Identities Tenant
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Azure AD External Identities"
3. Click "Create a tenant" → "Azure AD External Identities"
4. Choose your tenant name (e.g., `pokemongame`)

### 2. Configure User Flow
1. In your External Identities tenant:
   - Navigate to **Identity** → **External Identities** → **User flows**
   - Click **New user flow**
   - Select **Sign up and sign in (Recommended)**
   - Name: `signupsignin` (this creates `B2C_1_signupsignin`)

2. Configure attributes to collect:
   - ✅ Email address (Sign-up attribute + Application claim)
   - ✅ Given name (Sign-up attribute + Application claim)
   - ✅ Surname (Sign-up attribute + Application claim)
   - ✅ Display name (Application claim)

### 3. Register Application
1. Go to **App registrations** → **New registration**
2. **Name**: Pokemon Game Frontend
3. **Supported account types**: "Accounts in any identity provider or organizational directory"
4. **Redirect URI**: 
   - Platform: **Single-page application (SPA)**
   - URI: `http://localhost:3000`
5. Click **Register**

### 4. Configure API Permissions (for Dataverse)
1. In your app registration → **API permissions**
2. **Add a permission** → **APIs my organization uses**
3. Search for "Dynamics CRM" → Select it
4. **Delegated permissions** → Check `user_impersonation`
5. Click **Add permissions**
6. **Grant admin consent** for your tenant

### 5. Get Your Configuration Values
After setup, collect these values:

**From App Registration Overview:**
- Client ID: `12345678-1234-1234-1234-123456789012`

**Your Authority URL:**
- Format: `https://[tenant-name].b2clogin.com/[tenant-name].onmicrosoft.com/B2C_1_signupsignin`
- Example: `https://pokemongame.b2clogin.com/pokemongame.onmicrosoft.com/B2C_1_signupsignin`

---

## 🗄️ Dataverse/Dynamics 365 Setup

### 1. Access Power Platform Admin Center
1. Go to [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
2. Sign in with your Microsoft 365/Azure AD account
3. Select or create an environment

### 2. Get Environment Details
1. Click on your environment
2. Copy the **Environment URL**
   - Example: `https://orgname.crm.dynamics.com`

### 3. Create Custom Pokemon Entity
1. Go to [Power Apps](https://make.powerapps.com)
2. Select your environment
3. **Data** → **Tables** → **New table**

**Pokemon Table Configuration:**
```
Display name: Pokemon
Plural name: Pokemons
Schema name: new_pokemon (auto-generated)
Primary column: Name (new_name)
```

**Add these columns:**
- `new_species` (Text, 100 characters) - Pokemon species
- `new_type` (Text, 50 characters) - Pokemon type (Fire, Water, etc.)
- `new_level` (Whole number, min: 1, max: 100) - Pokemon level
- `new_imageurl` (Text, 500 characters) - URL to Pokemon image
- `new_caughtdate` (Date and time) - When Pokemon was caught
- `new_contactid` (Lookup, Related table: Contact) - Trainer who caught Pokemon

### 4. Configure Security
1. **Settings** → **Security** → **Security roles**
2. Find "Basic User" role → **Edit**
3. Add permissions for your Pokemon entity:
   - Create: Organization level
   - Read: Organization level  
   - Write: User level
   - Delete: User level

---

## 📋 Final Configuration Values

Update your `.env` file with these values:

```bash
# Azure External Identities (for user authentication)
REACT_APP_CLIENT_ID=your-app-registration-client-id
REACT_APP_AUTHORITY=https://your-tenant.b2clogin.com/your-tenant.onmicrosoft.com/B2C_1_signupsignin
REACT_APP_KNOWN_AUTHORITY=your-tenant.b2clogin.com
REACT_APP_REDIRECT_URI=http://localhost:3000
REACT_APP_POST_LOGOUT_REDIRECT_URI=http://localhost:3000

# Dataverse (service-to-service authentication)
REACT_APP_DATAVERSE_URL=https://your-org.crm.dynamics.com/api/data/v9.2
REACT_APP_DATAVERSE_TENANT_ID=your-dataverse-tenant-id
REACT_APP_DATAVERSE_CLIENT_ID=your-dataverse-app-client-id
REACT_APP_DATAVERSE_CLIENT_SECRET=your-dataverse-app-client-secret
REACT_APP_DATAVERSE_SCOPE=https://your-org.crm.dynamics.com/.default
```

## 🔧 Additional Setup for Cross-Tenant Dataverse

Since your Dataverse is in a different tenant than your Azure AD External Identities, you need:

### 1. Create App Registration in Dataverse Tenant
1. Go to Azure Portal for your **Dataverse tenant**
2. **App registrations** → **New registration**
3. **Name**: Pokemon Game Dataverse Service
4. **Supported account types**: "Accounts in this organizational directory only"
5. **No redirect URI needed** (this is for service-to-service)

### 2. Create Client Secret
1. In your Dataverse app registration → **Certificates & secrets**
2. **New client secret** → Add description and expiry
3. **Copy the secret value** immediately (you won't see it again)

### 3. Grant Dataverse Permissions
1. **API permissions** → **Add permission**
2. **APIs my organization uses** → Search "Dynamics CRM"
3. **Application permissions** → Check `user_impersonation`
4. **Grant admin consent**

### 4. Create Application User in Dataverse
1. Go to [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
2. Select your environment → **Settings** → **Users + permissions** → **Application users**
3. **New app user** → Select your app registration
4. Assign security roles: **System Administrator** (for development)

### 5. Get Required Values
- **Tenant ID**: From your Dataverse tenant overview
- **Client ID**: From your Dataverse app registration
- **Client Secret**: The secret you created

## 🧪 Testing Your Setup

1. Start the app: `npm start`
2. Click "Sign In / Sign Up"
3. You should be redirected to Azure B2C login page
4. Register a new account or sign in
5. After authentication, you should return to the app
6. Check that a Contact record was created in Dataverse

## 🔧 Troubleshooting

**Common Issues:**
- **CORS errors**: Make sure redirect URI is exactly `http://localhost:3000`
- **403 errors**: Check API permissions and admin consent
- **Authority URL**: Must include the user flow name `B2C_1_signupsignin`
- **Dataverse access**: Ensure proper security roles assigned
