import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * WORKSPACE ROUTER
 */

export const workspaceRouter = createTRPCRouter({
  // Get all workspaces for user
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db.workspace.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: [{ starred: "desc" }, { createdAt: "desc" }],
    });
  }),

  // Get single workspace by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: { bases: true },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      return workspace;
    }),

  // Create workspace
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.db.workspace.create({
        data: {
          name: input.name,
          userId: ctx.session.user.id,
        },
      });
    }),

  // Update workspace (name, starred)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        starred: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      return ctx.db.workspace.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.starred !== undefined && { starred: input.starred }),
        },
      });
    }),

  // Delete workspace
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      return ctx.db.workspace.delete({ where: { id: input.id } });
    }),
});
