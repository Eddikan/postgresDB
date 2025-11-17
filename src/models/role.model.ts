import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, CreatedAt, UpdatedAt, Unique, HasMany, BelongsToMany } from 'sequelize-typescript';
import { RoleName } from '../entities/Role';

@Table({
  tableName: 'roles',
  timestamps: true,
})
export default class Role extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(RoleName)))
  declare name: RoleName;

  @Column(DataType.TEXT)
  declare description?: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Associations (using function reference to avoid circular dependency)
  @HasMany(() => require('./user.model').default)
  declare users?: any[];

  @BelongsToMany(() => require('./permission.model').default, {
    through: 'role_permissions',
    foreignKey: 'roleId',
    otherKey: 'permissionId',
    as: 'permissions'
  })
  declare permissions?: any[];
}