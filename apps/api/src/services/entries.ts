import { and, arrayContains, asc, desc, eq, gte, isNull, lte, sql, type SQL } from "drizzle-orm";
import { Err, Ok, type Result } from "oxide.ts";
import { db, entriesTable, type Entry } from "@accounting/db";
import type { BreakdownInterval, CategoryBreakdown, DailyStatement, EntryInput, Filters, Statement } from "@accounting/shared";
import type { Currency } from "./currencies";
import { services } from "./services";

const day = sql<string>`to_char(${entriesTable.dateOfEntry}, 'YYYY-MM-DD')`;
const sumUsd = sql<number>`coalesce(sum(${entriesTable.valueAtDate}), 0)::float8`;
const sumAmount = sql<number>`coalesce(sum(${entriesTable.amount}), 0)::float8`;

class EntriesService {
  async create(organizationId: string, entryData: EntryInput): Promise<Result<Entry, string>> {
    try {
      const s = services();

      // a caller-provided USD value wins; otherwise value the entry at the current price
      let valueAtDate = entryData.usdValue;
      if (valueAtDate === undefined) {
        const price = await s.currencies.getPriceOf(entryData.currency as Currency);
        if (price.isErr()) {
          return Err(`Could not get price of ${entryData.currency}: ${price.unwrapErr()}. Pass usdValue to set the value explicitly.`);
        }
        valueAtDate = price.unwrap() * entryData.amount;
      }

      // tags must be of the format "key:value", they are stored as tag ids
      const tagIds: string[] = [];
      for (const tag of entryData.tags ?? []) {
        const parts = tag.split(":");
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          return Err("Invalid tag format, must be in the format 'key:value'");
        }

        const tagResult = await s.tags.insertOrGet(organizationId, parts[0], parts[1]);
        if (tagResult.isErr()) {
          return Err(tagResult.unwrapErr());
        }
        tagIds.push(tagResult.unwrap().id);
      }

      const dateOfEntry = entryData.dateOfEntry ? new Date(entryData.dateOfEntry) : new Date();
      if (Number.isNaN(dateOfEntry.getTime())) {
        return Err("Invalid dateOfEntry");
      }

      const [result] = await db()
        .insert(entriesTable)
        .values({
          organizationId,
          amount: entryData.amount,
          currency: entryData.currency,
          type: entryData.type,
          dateOfEntry,
          valueAtDate,
          category: entryData.category ?? null,
          tags: tagIds,
          metadata: entryData.metadata ?? {},
        })
        .returning();

      return Ok(result!);
    } catch (e) {
      return Err((e as Error).message);
    }
  }

  async find(organizationId: string, filters: Filters, limit = 100): Promise<Result<Entry[], string>> {
    try {
      const conditions = await this.getConditions(organizationId, filters);
      const result = await db()
        .select()
        .from(entriesTable)
        .where(and(...conditions))
        // newest first
        .orderBy(desc(entriesTable.dateOfEntry))
        .limit(limit);
      return Ok(result);
    } catch (e) {
      return Err((e as Error).message);
    }
  }

  // SQL conditions for a set of filters
  async getConditions(organizationId: string, filters: Filters): Promise<SQL[]> {
    const s = services();
    const conditions: SQL[] = [eq(entriesTable.organizationId, organizationId), isNull(entriesTable.deletedAt)];

    for (const tag of filters.tags ?? []) {
      const [key = "", value = ""] = tag.split(":");
      const tagResult = await s.tags.getByKeyAndValueAndOrganizationId(organizationId, key, value);

      // unknown tag: nothing can match
      if (tagResult.isNone()) {
        conditions.push(sql`false`);
        continue;
      }

      conditions.push(arrayContains(entriesTable.tags, [tagResult.unwrap().id]));
    }

    for (const [key, value] of Object.entries(filters.metadata ?? {})) {
      conditions.push(sql`${entriesTable.metadata}->>${key} = ${String(value)}`);
    }

    if (filters.category) {
      conditions.push(eq(entriesTable.category, filters.category));
    }

    if (filters.from) {
      conditions.push(gte(entriesTable.dateOfEntry, filters.from));
    }

    if (filters.to) {
      conditions.push(lte(entriesTable.dateOfEntry, filters.to));
    }

    return conditions;
  }

  async count(organizationId: string, filters: Filters): Promise<Result<number, string>> {
    try {
      const conditions = await this.getConditions(organizationId, filters);
      const [result] = await db()
        .select({ count: sql<number>`count(*)::int` })
        .from(entriesTable)
        .where(and(...conditions));
      return Ok(result?.count ?? 0);
    } catch (e) {
      return Err((e as Error).message);
    }
  }

  // total income / expenses (in USD) and the per-currency breakdown for a filter
  async getStatement(organizationId: string, filters: Filters): Promise<Result<Statement, string>> {
    try {
      const conditions = await this.getConditions(organizationId, filters);

      const rows = await db()
        .select({ type: entriesTable.type, currency: entriesTable.currency, sum: sumAmount, sumUsd })
        .from(entriesTable)
        .where(and(...conditions))
        .groupBy(entriesTable.type, entriesTable.currency)
        .orderBy(asc(entriesTable.currency));

      const incomeByCurrency = rows.filter((r) => r.type === "income").map(({ type: _, ...r }) => r);
      const expensesByCurrency = rows.filter((r) => r.type === "expense").map(({ type: _, ...r }) => r);
      const total = (list: { sumUsd: number }[]) => list.reduce((acc, r) => acc + r.sumUsd, 0);

      return Ok({
        income: total(incomeByCurrency),
        expenses: total(expensesByCurrency),
        incomeByCurrency,
        expensesByCurrency,
      });
    } catch (e) {
      return Err((e as Error).message);
    }
  }

  // same as getStatement, but grouped per day (YYYY-MM-DD, ascending)
  async getDailyStatement(organizationId: string, filters: Filters): Promise<Result<DailyStatement, string>> {
    try {
      const conditions = await this.getConditions(organizationId, filters);

      const rows = await db()
        .select({ date: day, type: entriesTable.type, currency: entriesTable.currency, sum: sumAmount, sumUsd })
        .from(entriesTable)
        .where(and(...conditions))
        .groupBy(day, entriesTable.type, entriesTable.currency)
        .orderBy(asc(day), asc(entriesTable.currency));

      const perDay = (type: "income" | "expense") => {
        const totals = new Map<string, number>();
        for (const r of rows) {
          if (r.type === type) totals.set(r.date, (totals.get(r.date) ?? 0) + r.sumUsd);
        }
        return [...totals].map(([date, sum]) => ({ date, sum }));
      };
      const byCurrency = (type: "income" | "expense") =>
        rows.filter((r) => r.type === type).map(({ date, currency, sum, sumUsd }) => ({ date, currency, sumUsd, sum }));

      return Ok({
        incomePerDay: perDay("income"),
        expensesPerDay: perDay("expense"),
        incomeByCurrencyPerDay: byCurrency("income"),
        expensesByCurrencyPerDay: byCurrency("expense"),
      });
    } catch (e) {
      return Err((e as Error).message);
    }
  }

  // USD totals per time bucket, type and category
  async getCategoryBreakdown(organizationId: string, filters: Filters, interval: BreakdownInterval): Promise<Result<CategoryBreakdown, string>> {
    try {
      const conditions = await this.getConditions(organizationId, filters);
      // interval is a validated enum; inlined so the select and group by expressions are identical
      const period = sql<string>`to_char(date_trunc('${sql.raw(interval)}', ${entriesTable.dateOfEntry}), 'YYYY-MM-DD')`;

      const rows = await db()
        .select({ period, type: entriesTable.type, category: entriesTable.category, sumUsd })
        .from(entriesTable)
        .where(and(...conditions))
        .groupBy(period, entriesTable.type, entriesTable.category)
        .orderBy(asc(period));

      return Ok({ interval, rows });
    } catch (e) {
      return Err((e as Error).message);
    }
  }

  // soft delete, scoped to the organization
  async delete(organizationId: string, id: string): Promise<Result<boolean, string>> {
    try {
      const result = await db()
        .update(entriesTable)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(entriesTable.id, id), eq(entriesTable.organizationId, organizationId), isNull(entriesTable.deletedAt)))
        .returning({ id: entriesTable.id });
      return Ok(result.length > 0);
    } catch (e) {
      return Err((e as Error).message);
    }
  }

  async getById(id: string): Promise<Result<Entry, string>> {
    try {
      const [result] = await db()
        .select()
        .from(entriesTable)
        .where(and(eq(entriesTable.id, id), isNull(entriesTable.deletedAt)))
        .limit(1);
      return result ? Ok(result) : Err("Entry not found");
    } catch (e) {
      // e.g. malformed uuid
      return Err((e as Error).message);
    }
  }
}

export default EntriesService;
