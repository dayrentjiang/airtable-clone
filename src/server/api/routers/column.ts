import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * COLUMN ROUTER
 */

export const columnRouter = createTRPCRouter({
  // Get all columns for a table
  getAllByTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.table.findFirst({
        where: { id: input.tableId },
        include: { base: { include: { workspace: true } } },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      return ctx.db.column.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
      });
    }),

  // Create a new column
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string().min(1),
        type: z.enum(["TEXT", "NUMBER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.table.findFirst({
        where: { id: input.tableId },
        include: { base: { include: { workspace: true } } },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      const lastColumn = await ctx.db.column.findFirst({
        where: { tableId: input.tableId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const newOrder = (lastColumn?.order ?? -1) + 1;

      return ctx.db.column.create({
        data: {
          name: input.name,
          type: input.type,
          tableId: input.tableId,
          order: newOrder,
        },
      });
    }),

  // Update a column
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        type: z.enum(["TEXT", "NUMBER"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const column = await ctx.db.column.findFirst({
        where: { id: input.id },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      if (!column || column.table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Column not found" });
      }

      return ctx.db.column.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.type && { type: input.type }),
        },
      });
    }),

  // Delete a column
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const column = await ctx.db.column.findFirst({
        where: { id: input.id },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      if (!column || column.table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Column not found" });
      }

      return ctx.db.column.delete({ where: { id: input.id } });
    }),
});
