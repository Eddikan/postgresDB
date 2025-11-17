// Drill Hole interface for raw SQL operations
export interface Drilling {
  id: string;
  projectId: string;
  drillingPlatform: string;
  contractor: string;
  mobilisationDate: Date;
  shift: string;
  holeId: string;
  startDate: Date;
  expectedDepth: number;
  metersDrilled: number;
  machineHours: number;
  standbyHours: number;
  drillingHours: number;
  downtime: number;
  downtimeCategory: string;
  reason: string;
  penetrationRate: number;
  utilisation: number;
  waterUsed: number;
  additives: string;
  fuelUsed: number;
  fieldTopUp: number;
  operationalComment?: string;
  notes?: string;
  photos?: string[]; // Array of photo URLs
  createdAt: Date;
  updatedAt: Date;
}

// Drill Hole creation interface (without auto-generated fields)
export interface CreateDrillingData {
  projectId: string;
  drillingPlatform: string;
  contractor: string;
  mobilisationDate: Date;
  shift: string;
  holeId: string;
  startDate: Date;
  expectedDepth: number;
  metersDrilled: number;
  machineHours: number;
  standbyHours: number;
  drillingHours: number;
  downtime: number;
  downtimeCategory: string;
  reason: string;
  penetrationRate: number;
  utilisation: number;
  waterUsed: number;
  additives: string;
  fuelUsed: number;
  fieldTopUp: number;
  operationalComment?: string;
  notes?: string;
  photos?: string[];
}

// Drill Hole update interface (all fields optional except id)
export interface UpdateDrillingData {
  id: string;
  projectId?: string;
  drillingPlatform?: string;
  contractor?: string;
  mobilisationDate?: Date;
  shift?: string;
  holeId?: string;
  startDate?: Date;
  expectedDepth?: number;
  metersDrilled?: number;
  machineHours?: number;
  standbyHours?: number;
  drillingHours?: number;
  downtime?: number;
  downtimeCategory?: string;
  reason?: string;
  penetrationRate?: number;
  utilisation?: number;
  waterUsed?: number;
  additives?: string;
  fuelUsed?: number;
  fieldTopUp?: number;
  operationalComment?: string;
  notes?: string;
  photos?: string[];
}

// Downtime categories enum
export enum DowntimeCategory {
  Mechanical = 'Mechanical',
  EquipmentFailure = 'Equipment Failure',
  Weather = 'Weather',
  Logistics = 'Logistics',
  Personnel = 'Personnel',
  OperationalDelay = 'Operational Delay',
  DrillingProblems = 'Drilling Problems',
  Standby = 'Standby'
}

// Shift options enum
export enum ShiftType {
  DayShift = 'Day Shift (8:00AM - 17:00PM)',
  NightShift = 'Night Shift (18:00PM - 7:00AM)'
}