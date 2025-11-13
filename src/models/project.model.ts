import { 
  Table, 
  Column, 
  Model, 
  DataType, 
  PrimaryKey, 
  Default, 
  AllowNull, 
  CreatedAt, 
  UpdatedAt,
  HasMany,
  ForeignKey,
  BelongsTo,
  Index
} from 'sequelize-typescript';
import Drilling from './drilling.model';
import Organisation from './organisation.model';
import User from './user.model';

@Table({
  tableName: 'projects',
  timestamps: true,
})
export default class Project extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare projectName: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare projectCode: string;

  @Column(DataType.STRING(2))
  declare country?: string;

  @Column(DataType.STRING(255))
  declare state?: string;

  @ForeignKey(() => Organisation)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare organisationId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare createdBy: string;

  @Column(DataType.DATEONLY)
  declare startDate?: Date;

  @Column(DataType.DATEONLY)
  declare endDate?: Date;

  @Column(DataType.ENUM('pending', 'active', 'completed', 'archived'))
  declare status?: string;

  @CreatedAt
  @Column(DataType.DATE)
  declare createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  declare updatedAt: Date;

  // Associations
  @BelongsTo(() => Organisation)
  declare organisation: Organisation;

  @BelongsTo(() => User, 'createdBy')
  declare creator: User;

  @HasMany(() => Drilling)
  declare drillings: Drilling[];
}