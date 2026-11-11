import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { addDays, getDaysInMonth, subDays } from 'date-fns';
import { PrismaService } from '@libs/db/prisma.service';
import { QueryBase } from '@libs/ddd/query.base';
import {
  endOfParisDay,
  parisDayOf,
  startOfParisDay,
} from '@libs/utils/paris-day';

export enum EarningsPeriod {
  today = 'TODAY',
  week = 'WEEK',
  month = 'MONTH',
}

export class GetMyEarningsQuery extends QueryBase {
  readonly driverId: string;

  readonly period: EarningsPeriod;

  constructor(props: GetMyEarningsQuery) {
    super();
    this.driverId = props.driverId;
    this.period = props.period;
  }
}

export interface DayEarningsReadModel {
  // "2026-11-11", a day in Paris.
  day: string;
  amountCents: number;
}

export interface DriverEarningsReadModel {
  // Every day of the period, in order, 0 when nothing was earned.
  days: DayEarningsReadModel[];
  rideCount: number;
}

// What the driver earned over a period, day by day: their completed rides,
// meter plus supplements, on the Paris day they ended. Spec
// docs/specs/gains-reels.md.
@QueryHandler(GetMyEarningsQuery)
export class GetMyEarningsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMyEarningsQuery): Promise<DriverEarningsReadModel> {
    const days = this.daysOf(query.period, parisDayOf(new Date()));
    const completions = await this.prisma.rideCompletion.findMany({
      where: {
        completedAt: {
          gte: startOfParisDay(days[0]),
          lt: endOfParisDay(days[days.length - 1]),
        },
        start: {
          arrival: { acceptance: { offer: { driverId: query.driverId } } },
        },
      },
      select: {
        completedAt: true,
        meterCents: true,
        supplements: { select: { unitPriceCents: true, quantity: true } },
      },
    });

    const amounts = new Map(days.map((day) => [day, 0]));
    for (const completion of completions) {
      const day = parisDayOf(completion.completedAt);
      const totalCents = completion.supplements.reduce(
        (total, s) => total + s.unitPriceCents * s.quantity,
        completion.meterCents,
      );
      amounts.set(day, (amounts.get(day) ?? 0) + totalCents);
    }
    return {
      days: days.map((day) => ({ day, amountCents: amounts.get(day) ?? 0 })),
      rideCount: completions.length,
    };
  }

  // The Paris days of the period: today alone, Monday to Sunday, or the
  // whole month. Calendar dates are computed at noon UTC, far from any
  // midnight, so the server's own time zone never moves them to another day.
  private daysOf(period: EarningsPeriod, today: string): string[] {
    const todayNoon = new Date(`${today}T12:00:00Z`);
    switch (period) {
      case EarningsPeriod.today:
        return [today];
      case EarningsPeriod.week: {
        // getUTCDay: 0 is Sunday; Monday starts the week.
        const monday = subDays(todayNoon, (todayNoon.getUTCDay() + 6) % 7);
        return this.calendarDays(monday, 7);
      }
      case EarningsPeriod.month: {
        const first = new Date(`${today.slice(0, 8)}01T12:00:00Z`);
        return this.calendarDays(first, getDaysInMonth(first));
      }
    }
  }

  private calendarDays(firstNoon: Date, count: number): string[] {
    return Array.from({ length: count }, (_, i) =>
      addDays(firstNoon, i).toISOString().slice(0, 10),
    );
  }
}
