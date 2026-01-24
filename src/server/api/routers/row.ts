import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Prisma } from "../../../../generated/prisma";
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
        limit: z.number().min(1).max(100).default(50),
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
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, viewId, filters, sorts, search, limit, offset } = input;

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

      // Get total count for pagination
      const countQuery = Prisma.sql`SELECT COUNT(*) as count FROM "Row" WHERE ${whereClause}`;
      const countResult =
        await ctx.db.$queryRaw<[{ count: bigint }]>(countQuery);
      const totalCount = Number(countResult[0]?.count ?? 0);

      // Get rows with pagination
      const rowsQuery = Prisma.sql`SELECT * FROM "Row" WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;

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

      return {
        items: rows,
        totalCount,
        hasMore: offset + rows.length < totalCount,
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
});
