import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import db from '../config/database';
import { UserProfile, UserStatus, Permission } from './auth-sql';

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-secret-key'
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    // Get user with role and permissions
    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u."phoneNumber",
        u.status,
        u."twoFactorEnabled",
        u."lastLogin",
        u."createdAt",
        u."updatedAt",
        r.id as role_id,
        r.name as role_name,
        r.description as role_description,
        array_agg(p.name) as permissions
      FROM users u
      LEFT JOIN roles r ON u."roleId" = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id, r.id, r.name, r.description
    `;
    
    const result = await db.query(userQuery, [payload.userId]);
    
    if (result.rows.length === 0) {
      return done(null, false);
    }
    
    const userData = result.rows[0];
    
    // Build user profile object
    const userProfile: UserProfile = {
      id: userData.id,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      status: userData.status as UserStatus,
      twoFactorEnabled: userData.twoFactorEnabled,
      lastLogin: userData.lastLogin,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      role: userData.role_id ? {
        id: userData.role_id,
        name: userData.role_name,
        description: userData.role_description,
        permissions: userData.permissions?.filter((p: any) => p !== null) as Permission[] || []
      } : undefined
    };
    
    return done(null, userProfile);
  } catch (error) {
    return done(error, false);
  }
}));

export default passport;