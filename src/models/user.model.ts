import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, CreatedAt, UpdatedAt, Unique, Index, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { AccountStatus, TwoFactorType, FieldRole } from '../entities/User';
import Role from './role.model';

@Table({
  tableName: 'users',
  timestamps: true,
})
export default class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @AllowNull(false)
  @Index
  @Column(DataType.STRING)
  declare email: string;

  @Column(DataType.STRING)
  declare firstName?: string;

  @Column(DataType.STRING)
  declare lastName?: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare password: string;

  @Default(AccountStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(AccountStatus)))
  declare accountStatus: AccountStatus;

  @ForeignKey(() => Role)
  @Column(DataType.UUID)
  declare roleId?: string;

  @Column(DataType.ENUM(...Object.values(FieldRole)))
  declare fieldRole?: FieldRole;

  // 2FA fields
  @Column(DataType.TEXT)
  declare twoFactorSecret?: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare twoFactorEnabled: boolean;

  @Column(DataType.ENUM(...Object.values(TwoFactorType)))
  declare twoFactorType?: TwoFactorType;

  @Column(DataType.STRING)
  declare twoFactorTarget?: string;

  @Column(DataType.STRING)
  declare twoFactorCode?: string;

  @Column(DataType.DATE)
  declare twoFactorCodeExpires?: Date;

  // Invitation fields
  @Column(DataType.STRING)
  declare invitationToken?: string;

  @Column(DataType.DATE)
  declare invitationExpires?: Date;

  @Column(DataType.UUID)
  declare invitedBy?: string;

  @Column(DataType.DATE)
  declare invitedAt?: Date;

  @Column(DataType.DATE)
  declare activatedAt?: Date;

  @Column(DataType.DATE)
  declare lastLogin?: Date;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare has_changed_default_password: boolean;

  @Column(DataType.DATE)
  declare passwordChangedAt?: Date;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Associations
  @BelongsTo(() => Role)
  declare role?: Role;
}