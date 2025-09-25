import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import db from '../config/database';
import { UserProfile, Permission } from './auth-sql';
import { AccountStatus } from '../entities';

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
        u."accountStatus",
        u."twoFactorEnabled",
        u."lastLogin",
        u."createdAt",
        u."updatedAt",
        r.id as "roleId",
        r.name as "roleName",
        r.description as "roleDescription",
        array_agg(p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
      FROM users u
      LEFT JOIN roles r ON u."roleId" = r.id
      LEFT JOIN role_permissions rp ON r.id = rp."roleId"
      LEFT JOIN permissions p ON rp."permissionId" = p.id
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
      accountStatus: userData.accountStatus as AccountStatus,
      twoFactorEnabled: userData.twoFactorEnabled,
      lastLogin: userData.lastLogin,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      role: userData.roleId ? {
        id: userData.roleId,
        name: userData.roleName,
        description: userData.roleDescription,
        permissions: userData.permissions?.filter((p: any) => p !== null) as Permission[] || []
      } : undefined
    };
    
    return done(null, userProfile);
  } catch (error) {
    return done(error, false);
  }
}));

export default passport;