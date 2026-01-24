import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { generateRowId } from "~/server/lib/id-generator";

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

  // Ensure user has at least one workspace with one base (for new users)
  ensureDefault: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Check if user has any workspaces
    const workspaceCount = await ctx.db.workspace.count({
      where: { userId },
    });

    // If user already has workspaces, do nothing
    if (workspaceCount > 0) {
      return { created: false, message: "User already has workspaces" };
    }

    // Create default workspace with a complete base structure
    // Includes: Base → Table → 3 Columns → 3 Sample Rows
    const workspace = await ctx.db.workspace.create({
      data: {
        name: "My Workspace",
        userId,
        bases: {
          create: {
            name: "My First Base",
            tables: {
              create: {
                name: "My First Table",
                columns: {
                  create: [
                    {
                      name: "Name",
                      type: "TEXT",
                      order: 0,
                    },
                    {
                      name: "Status",
                      type: "TEXT",
                      order: 1,
                    },
                    {
                      name: "Priority",
                      type: "TEXT",
                      order: 2,
                    },
                  ],
                },
              },
            },
          },
        },
      },
      include: {
        bases: {
          include: {
            tables: {
              include: {
                columns: true,
              },
            },
          },
        },
      },
    });

    // Get the created table and columns
    const table = workspace.bases[0]?.tables[0];
    const columns = table?.columns ?? [];

    // Create column ID map for sample data
    const nameCol = columns.find((c) => c.name === "Name");
    const statusCol = columns.find((c) => c.name === "Status");
    const priorityCol = columns.find((c) => c.name === "Priority");

    // Create 3 sample rows with data and default view
    if (table && nameCol && statusCol && priorityCol) {
      const sampleRows = [
        {
          id: generateRowId(),
          tableId: table.id,
          order: 0,
          data: {
            [nameCol.id]: "Welcome to Airtable Clone!",
            [statusCol.id]: "Active",
            [priorityCol.id]: "High",
          },
        },
        {
          id: generateRowId(),
          tableId: table.id,
          order: 1,
          data: {
            [nameCol.id]: "Click any cell to edit",
            [statusCol.id]: "In Progress",
            [priorityCol.id]: "Medium",
          },
        },
        {
          id: generateRowId(),
          tableId: table.id,
          order: 2,
          data: {
            [nameCol.id]: "Add more rows with the + button",
            [statusCol.id]: "Done",
            [priorityCol.id]: "Low",
          },
        },
      ];

      // Insert sample rows
      await ctx.db.row.createMany({
        data: sampleRows,
      });

      // Create default Grid view with no filters
      await ctx.db.view.create({
        data: {
          name: "Grid view",
          type: "GRID",
          order: 0,
          tableId: table.id,
          config: {
            filters: [],
            sorts: [],
            hiddenFields: [],
            fieldOrder: [],
          },
        },
      });
    }

    return {
      created: true,
      workspace,
      message: "Created default workspace with base, table, columns, and sample rows",
    };
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
