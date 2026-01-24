import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { viewConfigSchema } from "~/server/lib/types";

/**
 * VIEW ROUTER
 * A View stores display configurations for a table (filters, sorts, hidden fields)
 */

export const viewRouter = createTRPCRouter({
  /**
   * GET ALL VIEWS FOR A TABLE
   */
  getByTableId: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.table.findFirst({
        where: { id: input.tableId },
        include: { base: { include: { workspace: true } } },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      return ctx.db.view.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
      });
    }),

  /**
   * GET SINGLE VIEW BY ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const view = await ctx.db.view.findFirst({
        where: { id: input.id },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      if (!view || view.table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "View not found" });
      }

      return view;
    }),

  /**
   * CREATE A NEW VIEW
   */
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string().min(1).max(100),
        type: z
          .enum(["GRID", "CALENDAR", "KANBAN", "GALLERY", "FORM"])
          .default("GRID"),
        config: viewConfigSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.table.findFirst({
        where: { id: input.tableId },
        include: { base: { include: { workspace: true } } },
      });

      if (!table || table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      // Get next order
      const lastView = await ctx.db.view.findFirst({
        where: { tableId: input.tableId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      return ctx.db.view.create({
        data: {
          tableId: input.tableId,
          name: input.name,
          type: input.type,
          order: (lastView?.order ?? -1) + 1,
          config: input.config ?? {
            filters: [],
            sorts: [],
            hiddenFields: [],
            fieldOrder: [],
          },
        },
      });
    }),

  /**
   * UPDATE VIEW CONFIG (filters, sorts, hidden fields)
   */
  updateConfig: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        config: viewConfigSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const view = await ctx.db.view.findFirst({
        where: { id: input.id },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      if (!view || view.table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "View not found" });
      }

      return ctx.db.view.update({
        where: { id: input.id },
        data: { config: input.config },
      });
    }),

  /**
   * RENAME VIEW
   */
  rename: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const view = await ctx.db.view.findFirst({
        where: { id: input.id },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      if (!view || view.table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "View not found" });
      }

      return ctx.db.view.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  /**
   * DELETE VIEW
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const view = await ctx.db.view.findFirst({
        where: { id: input.id },
        include: {
          table: { include: { base: { include: { workspace: true } } } },
        },
      });

      if (!view || view.table.base.workspace.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "View not found" });
      }

      return ctx.db.view.delete({ where: { id: input.id } });
    }),
});
