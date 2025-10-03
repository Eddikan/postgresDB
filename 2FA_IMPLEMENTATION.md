# Two-Factor Authentication (2FA) System

This implementation provides a comprehensive 2FA system for the Primefrontier backend with support for Email OTP, SMS OTP, and TOTP (Google Authenticator).

## Features

- **Multiple 2FA Methods**: Email OTP, SMS OTP, TOTP (Google Authenticator)
- **Automatic 2FA Enforcement**: Users must enable 2FA within 7 days of changing their default password
- **Secure Login Flow**: 2FA verification integrated into login process
- **Clean Architecture**: Provider pattern for extensibility

## API Endpoints

### Setup 2FA
```
POST /2fa/setup
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "email|sms|totp",
  "target": "user@example.com" // Required for email/sms, not for totp
}
```

**Response for TOTP:**
```json
{
  "message": "Scan the QR code with your authenticator app...",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "type": "totp"
}
```

### Send OTP (Email/SMS only)
```
POST /2fa/send-otp
Authorization: Bearer <token>
```

### Verify 2FA Code
```
POST /2fa/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "123456"
}
```

### Login with 2FA
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "twoFactorCode": "123456" // Optional, required if 2FA is enabled
}
```

If 2FA is required but not provided:
```json
{
  "requiresTwoFactor": true,
  "userId": "user-id",
  "message": "Please provide your 2FA code to complete login"
}
```

### Get 2FA Status
```
GET /2fa/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "twoFactorEnabled": true,
  "twoFactorType": "totp",
  "hasChangedDefaultPassword": true,
  "passwordChangedAt": "2024-01-15T10:30:00Z",
  "requirement": {
    "required": true,
    "daysRemaining": 5,
    "blocked": false
  }
}
```

### Disable 2FA
```
POST /2fa/disable
Authorization: Bearer <token>
```

## Database Schema Updates

The following fields have been added to the `users` table:

```sql
-- New 2FA fields
"twoFactorType" VARCHAR(20) CHECK ("twoFactorType" IN ('email', 'sms', 'totp')),
"twoFactorTarget" VARCHAR(255),        -- email or phone number
"twoFactorCode" VARCHAR(255),          -- hashed OTP code
"twoFactorCodeExpires" TIMESTAMP,      -- OTP expiration
"passwordChangedAt" TIMESTAMP          -- when password was last changed
```

## Environment Variables

Add these to your `.env` file:

```env
# Twilio (for SMS 2FA)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Email already configured via Mailtrap
MAILTRAP_TOKEN=your_mailtrap_token
```

## Usage Examples

### 1. Setting up Email 2FA

```bash
# 1. Setup email 2FA
curl -X POST http://localhost:3000/2fa/setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "email", "target": "user@example.com"}'

# 2. Verify the test code sent to email
curl -X POST http://localhost:3000/2fa/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

### 2. Setting up TOTP (Google Authenticator)

```bash
# 1. Setup TOTP - returns QR code
curl -X POST http://localhost:3000/2fa/setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "totp"}'

# 2. Scan QR code with authenticator app
# 3. Verify with code from app
curl -X POST http://localhost:3000/2fa/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

### 3. Login with 2FA

```bash
# 1. Initial login (if 2FA enabled, will request code)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Response if 2FA required:
# {
#   "requiresTwoFactor": true,
#   "userId": "user-id",
#   "message": "Please provide your 2FA code to complete login"
# }

# 2. Complete login with 2FA code
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "twoFactorCode": "123456"
  }'
```

## Architecture

### Provider Pattern
- **TwoFactorProvider**: Interface for all 2FA providers
- **EmailProvider**: Handles email-based OTP
- **SmsProvider**: Handles SMS-based OTP  
- **TotpProvider**: Handles TOTP (Google Authenticator)

### Services
- **TwoFactorService**: Coordinates all providers and manages 2FA lifecycle
- **EmailService**: Existing service extended for 2FA emails

### Security Features
- **Code Expiration**: OTP codes expire after 5 minutes
- **Hashed Storage**: OTP codes are hashed before storage
- **Rate Limiting**: Built-in Fastify rate limiting
- **7-Day Enforcement**: Automatic 2FA requirement after password change

### Enforcement Flow
1. User changes default password → `has_changed_default_password = true`, `passwordChangedAt = now()`
2. For 7 days: User can access normally but gets warnings to enable 2FA
3. After 7 days: All API calls are blocked until 2FA is enabled (except auth and 2FA endpoints)

## Error Handling

The system provides clear error messages:

- `"2FA required before continuing"` - 7-day period expired
- `"Invalid verification code"` - Wrong 2FA code
- `"Verification code has expired"` - OTP code expired
- `"TOTP secret not found"` - TOTP not properly set up

## Testing

Use the existing test accounts:
- Super Admin: `imeekwere15@gmail.com` / `passworD12345#`
- Admin: `admin@primefrontier.com` / `admin123!@#`
- Manager: `manager@primefrontier.com` / `manager123`

## Production Considerations

1. **SMS Provider**: Configure Twilio credentials for production SMS
2. **Email Templates**: Customize email templates in EmailService
3. **Rate Limiting**: Adjust rate limits for 2FA endpoints if needed
4. **Code Expiration**: Adjust OTP expiration time as needed (default 5 minutes)
5. **Backup Codes**: Consider implementing backup codes for account recovery