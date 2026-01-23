import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * ROW ROUTER
 */

// Reusable schema for cell data (columnId -> value)
const cellDataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()]),
);

export const rowRouter = createTRPCRouter({
  /**
   * GET ROWS WITH CURSOR PAGINATION
   *
   * Used with useInfiniteQuery on the frontend:
   * ```
   * const { data, fetchNextPage, hasNextPage } = trpc.row.infinite.useInfiniteQuery(
   *   { tableId: "xxx", limit: 50 },
   *   { getNextPageParam: (lastPage) => lastPage.nextCursor }
   * );
   * ```
   */
  infinite: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(), // Row ID to start after
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, limit, cursor } = input;

      // Verify table exists and user owns it
      const table = await ctx.db.table.findFirst({
        where: { id: tableId },
        include: { base: true },
      });

      if (!table || table.base.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found",
        });
      }

      // Fetch limit + 1 to determine if there are more rows
      const rows = await ctx.db.row.findMany({
        where: { tableId },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { order: "asc" },
      });

      // Check if there's a next page
      let nextCursor: string | undefined = undefined;
      if (rows.length > limit) {
        const nextItem = rows.pop(); // Remove the extra item
        nextCursor = nextItem?.id;
      }

      return {
        items: rows,
        nextCursor,
      };
    }),

  /**
   * CREATE A NEW ROW
   *
   * ```
   * const createRow = trpc.row.create.useMutation();
   * createRow.mutate({ tableId: "xxx", data: { "col1": "value" } });
   * ```
   */
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        data: cellDataSchema.optional().default({}),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tableId, data } = input;

      // Verify table exists and user owns it
      const table = await ctx.db.table.findFirst({
        where: { id: tableId },
        include: { base: true },
      });

      if (!table || table.base.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found",
        });
      }

      // Get the next order value
      const lastRow = await ctx.db.row.findFirst({
        where: { tableId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const newOrder = (lastRow?.order ?? -1) + 1;

      return ctx.db.row.create({
        data: {
          tableId,
          data,
          order: newOrder,
        },
      });
    }),

  /**
   * UPDATE ROW DATA (for cell editing)
   *
   * Merges new data with existing data.
   * ```
   * const updateRow = trpc.row.update.useMutation();
   * updateRow.mutate({ id: "rowId", data: { "columnId": "new value" } });
   * ```
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

      // Verify row exists and user owns it
      const row = await ctx.db.row.findFirst({
        where: { id },
        include: {
          table: { include: { base: true } },
        },
      });

      if (!row || row.table.base.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Row not found",
        });
      }

      // Merge new data with existing data
      const existingData = (row.data as Record<string, unknown>) ?? {};
      const mergedData = { ...existingData, ...data };

      return ctx.db.row.update({
        where: { id },
        data: { data: mergedData },
      });
    }),

  /**
   * DELETE A ROW
   *
   * ```
   * const deleteRow = trpc.row.delete.useMutation();
   * deleteRow.mutate({ id: "rowId" });
   * ```
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // Verify row exists and user owns it
      const row = await ctx.db.row.findFirst({
        where: { id },
        include: {
          table: { include: { base: true } },
        },
      });

      if (!row || row.table.base.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Row not found",
        });
      }

      return ctx.db.row.delete({ where: { id } });
    }),
});
