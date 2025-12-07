import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export interface PlanetPosition {
  planet: string;
  sign: string;
  degree: number;
  house: number;
  isRetrograde: boolean;
}

export interface HouseData {
  house: number;
  sign: string;
  degree: number;
}

export interface AspectData {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
}

@Entity('natal_charts')
export class NatalChart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.natalChart)
  user: User;

  @Column({ type: 'jsonb' })
  planets: PlanetPosition[];

  @Column({ type: 'jsonb' })
  houses: HouseData[];

  @Column({ type: 'jsonb' })
  aspects: AspectData[];

  @Column()
  sunSign: string;

  @Column()
  moonSign: string;

  @Column()
  ascendant: string;

  @Column({ type: 'text', nullable: true })
  rawApiResponse: string;

  @Column({ type: 'text', nullable: true })
  aiInterpretation: string;

  @Column({ type: 'text', nullable: true })
  lifeStoryNarrative: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

