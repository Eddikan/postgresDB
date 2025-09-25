import pg from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const { Pool } = pg;

async function seedDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('render.com') 
      ? { rejectUnauthorized: false } 
      : false,
  });

  const client = await pool.connect();

  try {
    console.log('🌱 Starting database seeding on Render...');

    // Check if data already exists
    const existingRoles = await client.query('SELECT COUNT(*) FROM roles');
    const existingUsers = await client.query('SELECT COUNT(*) FROM users');
    
    console.log(`📊 Current data: ${existingRoles.rows[0].count} roles, ${existingUsers.rows[0].count} users`);

    // Insert sample projects (if projects table exists)
    try {
      await client.query(`
        INSERT INTO projects (name, description, location, "createdAt")
        VALUES 
          ('Bakken Shale Project', 'Oil extraction project in North Dakota', 'North Dakota, USA', NOW()),
          ('Permian Basin Development', 'Horizontal drilling in Permian Basin', 'Texas, USA', NOW()),
          ('Eagle Ford Formation', 'Unconventional drilling project', 'South Texas, USA', NOW())
        ON CONFLICT (name) DO NOTHING
      `);
      console.log('✅ Sample projects seeded');
    } catch (error) {
      console.log('ℹ️  Projects table may not exist, skipping project seeding');
    }

    // Insert sample drilling records (if drilling table exists)
    try {
      const projectResults = await client.query('SELECT id, name FROM projects LIMIT 3');
      
      if (projectResults.rows.length > 0) {
        for (const project of projectResults.rows) {
          await client.query(`
            INSERT INTO drillings (name, depth, status, "projectId", "createdAt")
            VALUES 
              ($1, $2, $3, $4, NOW()),
              ($5, $6, $7, $8, NOW())
            ON CONFLICT (name, "projectId") DO NOTHING
          `, [
            `Well-${project.name.split(' ')[0]}-001`, 8500, 'active', project.id,
            `Well-${project.name.split(' ')[0]}-002`, 9200, 'completed', project.id
          ]);
        }
        console.log('✅ Sample drilling records seeded');
      }
    } catch (error) {
      console.log('ℹ️  Drilling table may not exist, skipping drilling seeding');
    }

    // Add additional admin user
    try {
      const adminRoleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['admin']);
      
      if (adminRoleResult.rows.length > 0) {
        const adminRoleId = adminRoleResult.rows[0].id;
        const hashedPassword = await bcrypt.hash('admin123!@#', 12);
        
        await client.query(`
          INSERT INTO users (email, password, "firstName", "lastName", "roleId", "accountStatus")
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO NOTHING
        `, ['admin@primefrontier.com', hashedPassword, 'Admin', 'User', adminRoleId, 'active']);
        
        console.log('✅ Additional admin user created (admin@primefrontier.com / admin123!@#)');
      }
    } catch (error) {
      console.log('⚠️  Could not create additional admin user:', (error as Error).message);
    }

    // Add test manager user
    try {
      const managerRoleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['manager']);
      
      if (managerRoleResult.rows.length > 0) {
        const managerRoleId = managerRoleResult.rows[0].id;
        const hashedPassword = await bcrypt.hash('manager123', 12);
        
        await client.query(`
          INSERT INTO users (email, password, "firstName", "lastName", "roleId", "accountStatus")
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO NOTHING
        `, ['manager@primefrontier.com', hashedPassword, 'Project', 'Manager', managerRoleId, 'active']);
        
        console.log('✅ Test manager user created (manager@primefrontier.com / manager123)');
      }
    } catch (error) {
      console.log('⚠️  Could not create manager user:', (error as Error).message);
    }

    // Display final counts
    const finalRoles = await client.query('SELECT COUNT(*) FROM roles');
    const finalUsers = await client.query('SELECT COUNT(*) FROM users');
    const finalPermissions = await client.query('SELECT COUNT(*) FROM permissions');
    
    console.log('\n📈 Seeding Summary:');
    console.log(`   • ${finalRoles.rows[0].count} roles`);
    console.log(`   • ${finalUsers.rows[0].count} users`);
    console.log(`   • ${finalPermissions.rows[0].count} permissions`);

    console.log('\n👤 Available Test Accounts:');
    console.log('   • Super Admin: imeekwere15@gmail.com / passworD12345#');
    console.log('   • Admin: admin@primefrontier.com / admin123!@#');
    console.log('   • Manager: manager@primefrontier.com / manager123');

    console.log('\n🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeding
seedDatabase().catch(console.error);