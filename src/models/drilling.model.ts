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
  Index
} from 'sequelize-typescript';
import Project from './project.model';

@Table({
  tableName: 'drillings',
  timestamps: true,
})
export default class Drilling extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Project)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare projectId: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare drillingPlatform: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare contractor: string;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare mobilisationDate: Date;

  @AllowNull(false)
  @Column(DataType.ENUM('Day Shift (8:00AM - 17:00PM)', 'Night Shift (18:00PM - 7:00AM)'))
  declare shift: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING(100))
  declare holeId: string;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare startDate: Date;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare expectedDepth: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare metersDrilled: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(8, 2))
  declare machineHours: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(8, 2))
  declare standbyHours: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(8, 2))
  declare drillingHours: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(8, 2))
  declare downtime: number;

  @AllowNull(false)
  @Column(DataType.ENUM(
    'Mechanical',
    'Equipment Failure', 
    'Weather',
    'Logistics',
    'Personnel',
    'Operational Delay',
    'Drilling Problems',
    'Standby'
  ))
  declare downtimeCategory: string;

  @AllowNull(false)
  @Column(DataType.STRING(500))
  declare reason: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(8, 2))
  declare penetrationRate: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(5, 2))
  declare utilisation: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare waterUsed: number;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  declare additives: string;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare fuelUsed: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  declare fieldTopUp: number;

  @Column(DataType.TEXT)
  declare operationalComment?: string;

  @Column(DataType.TEXT)
  declare notes?: string;

  @Column(DataType.TEXT)
  declare photos?: string;

  @CreatedAt
  @Column(DataType.DATE)
  declare createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  declare updatedAt: Date;

  // Associations
  @BelongsTo(() => Project)
  declare project: Project;
}