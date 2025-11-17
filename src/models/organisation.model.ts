import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, CreatedAt, UpdatedAt, Unique, HasMany } from 'sequelize-typescript';
import User from './user.model';

@Table({
  tableName: 'organisations',
  timestamps: true,
})
export default class Organisation extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.TEXT)
  declare address?: string;

  @Column(DataType.INTEGER)
  declare size?: number;

  @Column(DataType.UUID)
  declare createdBy?: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  // Associations
  @HasMany(() => User, 'organisationId')
  declare users?: User[];
}