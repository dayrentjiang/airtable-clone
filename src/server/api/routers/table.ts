import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { generateRowId } from "~/server/lib/id-generator";

export const tableRouter = createTRPCRouter({
  getAllByBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          workspace: { userId: ctx.session.user.id },
        },
      });

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Base not found" });
      }

      return ctx.db.table.findMany({
        where: { baseId: input.baseId },
        orderBy: { createdAt: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.table.findFirst({
        where: { id: input.id },
        include: {
          base: { include: { workspace: true } },
          columns: { orderBy: { order: "asc" } },
        },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      return table;
    }),

  create: protectedProcedure
    .input(
      z.object({
        baseId: z.string(),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          workspace: { userId: ctx.session.user.id },
        },
      });

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Base not found" });
      }

      const table = await ctx.db.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
          columns: {
            create: [
              { name: "Name", type: "TEXT", order: 0 },
              { name: "Notes", type: "TEXT", order: 1 },
              { name: "Amount", type: "NUMBER", order: 2 },
            ],
          },
          views: {
            create: {
              name: "Grid view",
              type: "GRID",
              order: 0,
              config: {
                filters: [],
                sorts: [],
                hiddenFields: [],
                fieldOrder: [],
              },
            },
          },
        },
        include: { columns: true, views: true },
      });

      // Create a default empty row
      await ctx.db.row.create({
        data: {
          id: generateRowId(),
          tableId: table.id,
          order: 0,
          data: {},
        },
      });

      return table;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.table.findFirst({
        where: { id: input.id },
        include: { base: { include: { workspace: true } } },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      return ctx.db.table.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.table.findFirst({
        where: { id: input.id },
        include: { base: { include: { workspace: true } } },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      return ctx.db.table.delete({ where: { id: input.id } });
    }),
});
