import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { NatalChart } from '../../astrology/entities/natal-chart.entity';

export enum ConversationState {
  NEW = 'NEW',
  AWAITING_NAME = 'AWAITING_NAME',
  AWAITING_BIRTH_DATE = 'AWAITING_BIRTH_DATE',
  AWAITING_BIRTH_TIME = 'AWAITING_BIRTH_TIME',
  AWAITING_BIRTH_PLACE = 'AWAITING_BIRTH_PLACE',
  CHART_READY = 'CHART_READY',
  CHATTING = 'CHATTING',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ type: 'time', nullable: true })
  birthTime: string;

  @Column({ nullable: true })
  birthPlace: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  birthLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  birthLongitude: number;

  @Column({ nullable: true })
  timezone: string;

  @Column({
    type: 'enum',
    enum: ConversationState,
    default: ConversationState.NEW,
  })
  conversationState: ConversationState;

  @OneToOne(() => NatalChart, (chart) => chart.user, { cascade: true })
  @JoinColumn()
  natalChart: NatalChart;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

