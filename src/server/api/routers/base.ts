import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { generateRowId } from "~/server/lib/id-generator";

/***ctx created in Created in src/server/api/trpc.ts
 * ctx is an object that gets passed to every procedure.
 * It contains shared data needed by your routes.
 ***/

export const baseRouter = createTRPCRouter({
  // ============================================
  // GET ALL BASES
  // ============================================
  // Frontend: const { data: bases } = trpc.base.getAll.useQuery();
  // This is a "query" = read-only operation (like GET)
  getAll: protectedProcedure.query(({ ctx }) => {
    // ctx.session.user.id = current logged-in user (from NextAuth)
    // ctx.db = Prisma client
    return ctx.db.base.findMany({
      where: {
        workspace: {
          userId: ctx.session.user.id,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // ============================================
  // GET SINGLE BASE BY ID
  // ============================================
  // Frontend: const { data: base } = trpc.base.getById.useQuery({ id: "xxx" });
  // .input() = validates the input using Zod schema
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.id,
          workspace: {
            userId: ctx.session.user.id,
          },
        },
        include: { tables: true },
      });

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Base not found" });
      }

      return base;
    }),

  // ============================================
  // CREATE A NEW BASE
  // ============================================
  // Frontend: const createBase = trpc.base.create.useMutation();
  //           createBase.mutate({ name: "My Base", workspaceId: "xxx" });
  // This is a "mutation" = write operation (like POST/PUT/DELETE)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        workspaceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the workspace belongs to the user
      const workspace = await ctx.db.workspace.findFirst({
        where: {
          id: input.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      // Create base with default table, columns, and sample rows
      const base = await ctx.db.base.create({
        data: {
          name: input.name,
          workspaceId: input.workspaceId,
          tables: {
            create: {
              name: "Table 1",
              columns: {
                create: [
                  {
                    name: "Name",
                    type: "TEXT",
                    order: 0,
                  },
                  {
                    name: "Notes",
                    type: "TEXT",
                    order: 1,
                  },
                  {
                    name: "Status",
                    type: "TEXT",
                    order: 2,
                  },
                ],
              },
            },
          },
        },
        include: {
          tables: {
            include: {
              columns: true,
            },
          },
        },
      });

      // Get the created table and columns
      const table = base.tables[0];
      const columns = table?.columns ?? [];

      // Create column ID map for sample data
      const nameCol = columns.find((c) => c.name === "Name");
      const notesCol = columns.find((c) => c.name === "Notes");
      const statusCol = columns.find((c) => c.name === "Status");

      // Create 3 sample rows with helpful data
      if (table && nameCol && notesCol && statusCol) {
        const sampleRows = [
          {
            id: generateRowId(),
            tableId: table.id,
            order: 0,
            data: {
              [nameCol.id]: "Task 1",
              [notesCol.id]: "Click any cell to edit its content",
              [statusCol.id]: "Todo",
            },
          },
          {
            id: generateRowId(),
            tableId: table.id,
            order: 1,
            data: {
              [nameCol.id]: "Task 2",
              [notesCol.id]: "Use the + button below to add more rows",
              [statusCol.id]: "In Progress",
            },
          },
          {
            id: generateRowId(),
            tableId: table.id,
            order: 2,
            data: {
              [nameCol.id]: "Task 3",
              [notesCol.id]: "Customize your columns from the toolbar",
              [statusCol.id]: "Done",
            },
          },
        ];

        // Insert sample rows
        await ctx.db.row.createMany({
          data: sampleRows,
        });
      }

      return base;
    }),

  // ============================================
  // DELETE A BASE
  // ============================================
  // Frontend: const deleteBase = trpc.base.delete.useMutation();
  //           deleteBase.mutate({ id: "xxx" });
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.id,
          workspace: {
            userId: ctx.session.user.id,
          },
        },
      });

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Base not found" });
      }

      return ctx.db.base.delete({ where: { id: input.id } });
    }),
});
