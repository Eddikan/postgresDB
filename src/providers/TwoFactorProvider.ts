export interface TwoFactorProvider {
  /**
   * Send a 2FA code to the user
   * @param target - The target (email address, phone number, or user identifier)
   * @param code - The code to send (for OTP providers)
   * @returns Promise<boolean> indicating success
   */
  send(target: string, code?: string): Promise<boolean>;

  /**
   * Verify a 2FA code
   * @param secret - The stored secret (for TOTP) or code (for OTP)
   * @param providedCode - The code provided by the user
   * @param expiresAt - Expiration time (for OTP providers)
   * @returns Promise<boolean> indicating if verification was successful
   */
  verify(secret: string, providedCode: string, expiresAt?: Date): Promise<boolean>;

  /**
   * Setup/initialize the provider for a user
   * @param target - The target (email, phone, or user identifier)
   * @returns Promise with setup data (e.g., QR code for TOTP, confirmation for email/SMS)
   */
  setup?(target: string): Promise<any>;
}

export interface TwoFactorSetupResult {
  success: boolean;
  secret?: string;
  qrCode?: string;
  message?: string;
  error?: string;
}