import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, CreatedAt, UpdatedAt, Unique } from 'sequelize-typescript';

@Table({
  tableName: 'permissions',
  timestamps: true,
})
export default class Permission extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.TEXT)
  declare description?: string;

  @Column(DataType.STRING)
  declare resource?: string;

  @Column(DataType.STRING)
  declare action?: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;
}