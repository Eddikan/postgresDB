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
  ForeignKey,
  BelongsTo,
  Index,
  Unique
} from 'sequelize-typescript';
import User from './user.model';
import Organisation from './organisation.model';

export enum MediaType {
  DRILL_HOLE = 'DRILL_HOLE',
  PROJECT = 'PROJECT',
  SAMPLE = 'SAMPLE',
  REPORT = 'REPORT'
}

@Table({
  tableName: 'media',
  timestamps: true,
})
export default class Media extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare url: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(MediaType)))
  declare type: MediaType;

  @AllowNull(false)
  @Column(DataType.STRING(500))
  declare filename: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare mimetype: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare size: number;

  @Unique
  @AllowNull(false)
  @Index
  @Column(DataType.STRING(500))
  declare s3Key: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare uploadedBy: string;

  @ForeignKey(() => Organisation)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare organisationId: string;

  @CreatedAt
  @Column(DataType.DATE)
  declare createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  declare updatedAt: Date;

  // Associations
  @BelongsTo(() => User, 'uploadedBy')
  declare uploader: User;

  @BelongsTo(() => Organisation)
  declare organisation: Organisation;
}
