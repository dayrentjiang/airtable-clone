import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Prisma } from "../../../../generated/prisma";
import { faker } from "@faker-js/faker";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  type ViewConfig,
  type CellData,
  cellDataSchema,
  filterSchema,
  sortSchema,
} from "~/server/lib/types";
import {
  buildFilterCondition,
  buildSortClause,
  buildSearchCondition,
} from "~/server/lib/query-builder";
import { generateRowId } from "~/server/lib/id-generator";

/**
 * ROW ROUTER
 */

export const rowRouter = createTRPCRouter({
  /**
   * GET ROWS WITH CURSOR PAGINATION (no filters/sorts)
   */
  infinite: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().min(1).max(500).default(50),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, limit, cursor } = input;

      const table = await ctx.db.table.findFirst({
        where: { id: tableId },
        include: { base: { include: { workspace: true } } },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      const rows = await ctx.db.row.findMany({
        where: { tableId },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { order: "asc" },
      });

      let nextCursor: string | undefined = undefined;
      if (rows.length > limit) {
        const nextItem = rows.pop();
        nextCursor = nextItem?.id;
      }

      return { items: rows, nextCursor };
    }),

  /**
   * GET ROWS WITH VIEW CONFIG (filters, sorts, search)
   * Uses raw SQL for JSONB queries - optimized for 100k rows
   */
  infiniteWithView: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        viewId: z.string().optional(),
        // Override view config (for live filtering without saving)
        filters: z.array(filterSchema).optional(),
        sorts: z.array(sortSchema).optional(),
        search: z.string().optional(), // Global search across all columns
        limit: z.number().min(1).max(500).default(50),
        cursor: z.string().nullish(), // Cursor-based pagination
        offset: z.number().optional(), // Offset-based pagination (for virtual scrolling jumps)
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, viewId, filters, sorts, search, limit, cursor, offset } = input;

      // Verify table ownership
      const table = await ctx.db.table.findFirst({
        where: { id: tableId },
        include: {
          base: { include: { workspace: true } },
          columns: true,
        },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      // Build column type map for proper sorting/filtering
      const columnTypes = new Map<string, "TEXT" | "NUMBER">();
      table.columns.forEach((col) => columnTypes.set(col.id, col.type));

      // Get view config if viewId provided
      let viewConfig: ViewConfig | null = null;
      if (viewId) {
        const view = await ctx.db.view.findFirst({
          where: { id: viewId, tableId },
        });
        if (view) {
          viewConfig = view.config as ViewConfig;
        }
      }

      // Use provided filters/sorts or fall back to view config
      const activeFilters = filters ?? viewConfig?.filters ?? [];
      const activeSorts = sorts ?? viewConfig?.sorts ?? [];

      // Start building the query parts
      const filterConditions: Prisma.Sql[] = [];

      // Add filter conditions
      for (const filter of activeFilters) {
        const columnType = columnTypes.get(filter.columnId) ?? "TEXT";
        const condition = buildFilterCondition(filter, columnType);
        if (condition) {
          filterConditions.push(condition);
        }
      }

      // Add global search (searches across all text columns)
      if (search?.trim()) {
        const textColumnIds = table.columns
          .filter((col) => col.type === "TEXT")
          .map((col) => col.id);

        const searchCondition = buildSearchCondition(search, textColumnIds);
        if (searchCondition) {
          filterConditions.push(searchCondition);
        }
      }

      // Build complete WHERE clause
      let whereClause: Prisma.Sql;
      if (filterConditions.length === 0) {
        whereClause = Prisma.sql`"tableId" = ${tableId}`;
      } else {
        // Build with all conditions
        whereClause = Prisma.sql`"tableId" = ${tableId}`;
        for (const condition of filterConditions) {
          whereClause = Prisma.sql`${whereClause} AND ${condition}`;
        }
      }

      // Build ORDER BY
      const orderBy = buildSortClause(activeSorts, columnTypes);

      // Add cursor condition if provided (cursor takes precedence over offset)
      let useOffset = false;
      if (cursor) {
        // Get the cursor row's order value for pagination
        const cursorRow = await ctx.db.row.findUnique({
          where: { id: cursor },
          select: { order: true },
        });
        if (cursorRow) {
          whereClause = Prisma.sql`${whereClause} AND "order" > ${cursorRow.order}`;
        }
      } else if (offset !== undefined && offset > 0) {
        // Use offset-based pagination for virtual scrolling jumps
        useOffset = true;
      }

      // Build base WHERE clause (without cursor) for counting
      let baseWhereClause: Prisma.Sql;
      if (filterConditions.length === 0) {
        baseWhereClause = Prisma.sql`"tableId" = ${tableId}`;
      } else {
        baseWhereClause = Prisma.sql`"tableId" = ${tableId}`;
        for (const condition of filterConditions) {
          baseWhereClause = Prisma.sql`${baseWhereClause} AND ${condition}`;
        }
      }

      // Get total count (without cursor/limit) - this tells us total matching rows
      const countQuery = Prisma.sql`SELECT COUNT(*)::int as count FROM "Row" WHERE ${baseWhereClause}`;
      const countResult = await ctx.db.$queryRaw<[{ count: number }]>(countQuery);
      const totalCount = countResult[0]?.count ?? 0;

      // Get rows with pagination (fetch limit + 1 to check if there's more)
      // Use offset-based pagination when jumping to a position, cursor-based otherwise
      const rowsQuery = useOffset
        ? Prisma.sql`SELECT * FROM "Row" WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ${limit + 1} OFFSET ${offset}`
        : Prisma.sql`SELECT * FROM "Row" WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ${limit + 1}`;

      const rows = await ctx.db.$queryRaw<
        Array<{
          id: string;
          data: unknown;
          order: number;
          tableId: string;
          createdAt: Date;
          updatedAt: Date;
        }>
      >(rowsQuery);

      // Check if there's a next page
      let nextCursor: string | undefined = undefined;
      if (rows.length > limit) {
        const nextItem = rows.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: rows,
        nextCursor,
        totalCount,
        // Return the offset that was used (0 if cursor-based or first page)
        offset: useOffset ? offset! : 0,
      };
    }),

  /**
   * CREATE A NEW ROW
   * Supports client-generated IDs for optimistic updates
   */
  create: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(), // Optional: client can provide ID for optimistic updates
        tableId: z.string(),
        data: cellDataSchema.optional().default({}),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tableId, data } = input;

      const table = await ctx.db.table.findFirst({
        where: { id: tableId },
        include: { base: { include: { workspace: true } } },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      const lastRow = await ctx.db.row.findFirst({
        where: { tableId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const newOrder = (lastRow?.order ?? -1) + 1;

      // Generate ID if not provided (backward compatibility)
      const rowId = id ?? generateRowId();

      // Use upsert to handle duplicate IDs gracefully (e.g., network retries)
      return ctx.db.row.upsert({
        where: { id: rowId },
        update: {
          // If row already exists (rare), update it
          data,
          order: newOrder,
        },
        create: {
          // If row doesn't exist, create it
          id: rowId,
          tableId,
          data,
          order: newOrder,
        },
      });
    }),

  /**
   * UPDATE SINGLE CELL (optimized for cell editing)
   */
  updateCell: protectedProcedure
    .input(
      z.object({
        rowId: z.string(),
        columnId: z.string(),
        value: z.union([z.string(), z.number(), z.null()]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { rowId, columnId, value } = input;

      const row = await ctx.db.row.findFirst({
        where: { id: rowId },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      if (!row || row.table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Row not found" });
      }

      // Parse existing data
      const existingData: CellData =
        typeof row.data === "object" &&
        row.data !== null &&
        !Array.isArray(row.data)
          ? (row.data as CellData)
          : {};

      // Update single cell
      const updatedData: CellData = {
        ...existingData,
        [columnId]: value,
      };

      return ctx.db.row.update({
        where: { id: rowId },
        data: { data: updatedData },
      });
    }),

  /**
   * UPDATE ROW DATA (for cell editing)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: cellDataSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;

      const row = await ctx.db.row.findFirst({
        where: { id },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      if (!row || row.table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Row not found" });
      }

      // Parse existing data safely ensure it matches our expected structure
      const existingData: CellData =
        typeof row.data === "object" &&
        row.data !== null &&
        !Array.isArray(row.data)
          ? (row.data as CellData)
          : {};

      // Merge with new data - both are properly typed as CellData
      const mergedData: CellData = { ...existingData, ...data };

      return ctx.db.row.update({
        where: { id },
        data: { data: mergedData },
      });
    }),

  /**
   * DELETE A ROW
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const row = await ctx.db.row.findFirst({
        where: { id },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      if (!row || row.table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Row not found" });
      }

      return ctx.db.row.delete({ where: { id } });
    }),

  /**
   * BULK DELETE ROWS
   * Deletes multiple rows at once (for multi-select delete)
   */
  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1).max(1000), // Allow up to 1000 rows at once
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { ids } = input;

      // Verify all rows exist and belong to user before deleting
      const rows = await ctx.db.row.findMany({
        where: { id: { in: ids } },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      // Check if all rows belong to the user
      const unauthorizedRow = rows.find(
        (row) => row.table.base.workspace.userId !== ctx.session.user.id,
      );

      if (unauthorizedRow || rows.length !== ids.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more rows not found or unauthorized",
        });
      }

      // Delete all rows in a single transaction
      const result = await ctx.db.row.deleteMany({
        where: { id: { in: ids } },
      });

      return { count: result.count };
    }),

  /**
   * CLEAR ROW VALUES
   * Clears all data values from specified rows (sets data to empty object)
   * Used when pressing Backspace/Delete on selected rows
   */
  clearRowValues: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1).max(1000), // Allow up to 1000 rows at once
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { ids } = input;

      // Verify all rows exist and belong to user before clearing
      const rows = await ctx.db.row.findMany({
        where: { id: { in: ids } },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      // Check if all rows belong to the user
      const unauthorizedRow = rows.find(
        (row) => row.table.base.workspace.userId !== ctx.session.user.id,
      );

      if (unauthorizedRow || rows.length !== ids.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more rows not found or unauthorized",
        });
      }

      // Clear data for all rows in a single update
      const result = await ctx.db.row.updateMany({
        where: { id: { in: ids } },
        data: { data: {} as Prisma.InputJsonValue },
      });

      return { count: result.count };
    }),

  /**
   * BULK CREATE ROWS (optimized for large datasets)
   * Uses batch inserts and generates fake data with Faker.js
   */
  bulkCreate: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        count: z.number().min(1).max(100000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tableId, count } = input;

      console.log(`[BULK CREATE] Starting: ${count} rows for table ${tableId}`);

      // Verify table ownership and get columns
      const table = await ctx.db.table.findFirst({
        where: { id: tableId },
        include: {
          base: { include: { workspace: true } },
          columns: { orderBy: { order: "asc" } },
        },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      // Get the last order to continue from
      const lastRow = await ctx.db.row.findFirst({
        where: { tableId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const startOrder = (lastRow?.order ?? -1) + 1;

      // Helper function to generate fake data based on column type
      const generateFakeValue = (
        columnType: string,
        columnName: string,
      ): string | number => {
        if (columnType === "NUMBER") {
          // Generate numbers based on column name hints
          if (columnName.toLowerCase().includes("age")) {
            return faker.number.int({ min: 18, max: 80 });
          } else if (
            columnName.toLowerCase().includes("price") ||
            columnName.toLowerCase().includes("cost")
          ) {
            return faker.number.float({
              min: 10,
              max: 10000,
              fractionDigits: 2,
            });
          } else if (
            columnName.toLowerCase().includes("quantity") ||
            columnName.toLowerCase().includes("count")
          ) {
            return faker.number.int({ min: 1, max: 1000 });
          }
          return faker.number.int({ min: 1, max: 100000 });
        } else {
          // TEXT columns - generate based on column name hints
          const lowerName = columnName.toLowerCase();
          if (lowerName.includes("name") || lowerName === "name") {
            return faker.person.fullName();
          } else if (lowerName.includes("email")) {
            return faker.internet.email();
          } else if (lowerName.includes("phone")) {
            return faker.phone.number();
          } else if (lowerName.includes("address")) {
            return faker.location.streetAddress();
          } else if (lowerName.includes("city")) {
            return faker.location.city();
          } else if (lowerName.includes("country")) {
            return faker.location.country();
          } else if (lowerName.includes("company")) {
            return faker.company.name();
          } else if (lowerName.includes("job") || lowerName.includes("title")) {
            return faker.person.jobTitle();
          } else if (
            lowerName.includes("description") ||
            lowerName.includes("notes")
          ) {
            return faker.lorem.sentence();
          }
          // Default: random words
          return faker.lorem.words(3);
        }
      };

      // Use 1000 rows per batch for stable performance
      const BATCH_SIZE = 1000;
      const batches = Math.ceil(count / BATCH_SIZE);

      let totalInserted = 0;

      try {
        for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
          const batchStart = batchIndex * BATCH_SIZE;
          const batchEnd = Math.min(batchStart + BATCH_SIZE, count);
          const batchSize = batchEnd - batchStart;

          console.log(
            `[BULK CREATE] Batch ${batchIndex + 1}/${batches}: inserting ${batchSize} rows`,
          );

          // Generate rows for this batch with fake data
          const rows = Array.from({ length: batchSize }, (_, i) => {
            const rowIndex = batchStart + i;

            // Generate fake data for each column
            const rowData: Record<string, string | number> = {};
            table.columns.forEach((column) => {
              rowData[column.id] = generateFakeValue(column.type, column.name);
            });

            return {
              id: generateRowId(),
              tableId,
              data: rowData as Prisma.InputJsonValue,
              order: startOrder + rowIndex,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          });

          // Bulk insert using Prisma's createMany (optimized)
          await ctx.db.row.createMany({
            data: rows,
            skipDuplicates: true,
          });

          totalInserted += batchSize;
          console.log(
            `[BULK CREATE] Progress: ${totalInserted}/${count} rows (${Math.round((totalInserted / count) * 100)}%)`,
          );
        }

        console.log(
          `[BULK CREATE] Completed: ${totalInserted} rows inserted with fake data`,
        );

        return {
          success: true,
          count: totalInserted,
          message: `Successfully created ${totalInserted.toLocaleString()} rows with realistic data`,
        };
      } catch (error) {
        console.error(
          `[BULK CREATE] Error after ${totalInserted} rows:`,
          error,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed after inserting ${totalInserted} rows: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
