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

// Type that matches our Zod schema
type CellData = Record<string, string | number | null>;

export const rowRouter = createTRPCRouter({
  /**
   * GET ROWS WITH CURSOR PAGINATION
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
   * CREATE A NEW ROW
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

      return ctx.db.row.create({
        data: { tableId, data, order: newOrder },
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
