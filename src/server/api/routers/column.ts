import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * COLUMN ROUTER
 * 
 * This handles all operations related to columns:
 * - Creating new columns dynamically
 * - Updating column names/types
 * - Deleting columns
 * - Reordering columns
 */

export const columnRouter = createTRPCRouter({
  // ============================================
  // GET ALL COLUMNS FOR A TABLE
  // ============================================
  // Frontend: const { data: columns } = trpc.column.getAllByTable.useQuery({ tableId: "xxx" });
  // Returns columns sorted by their display order (left to right)
  getAllByTable: protectedProcedure
    .input(z.object({ 
      tableId: z.string() 
    }))
    .query(async ({ ctx, input }) => {
      // Step 1: Verify the table exists and user owns it
      const table = await ctx.db.table.findFirst({
        where: { id: input.tableId },
        include: { base: true },
      });

      if (!table || table.base.userId !== ctx.session.user.id) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Table not found" 
        });
      }

      // Step 2: Return all columns in display order
      return ctx.db.column.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" }, // Left to right order
      });
    }),

  // ============================================
  // CREATE A NEW COLUMN
  // ============================================
  // Frontend: const createColumn = trpc.column.create.useMutation();
  //           createColumn.mutate({ 
  //             tableId: "xxx", 
  //             name: "Email", 
  //             type: "TEXT" 
  //           });
  create: protectedProcedure
    .input(z.object({
      tableId: z.string(),
      name: z.string().min(1),
      type: z.enum(["TEXT", "NUMBER"]), // Must match Prisma enum
    }))
    .mutation(async ({ ctx, input }) => {
      // Step 1: Verify table exists and user owns it
      const table = await ctx.db.table.findFirst({
        where: { id: input.tableId },
        include: { base: true },
      });

      if (!table || table.base.userId !== ctx.session.user.id) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Table not found" 
        });
      }

      // Step 2: Find the highest order number (rightmost column)
      const lastColumn = await ctx.db.column.findFirst({
        where: { tableId: input.tableId },
        orderBy: { order: "desc" }, // Get the highest order
        select: { order: true },
      });

      // Step 3: Create the new column at the end
      const newOrder = (lastColumn?.order ?? -1) + 1;
      
      return ctx.db.column.create({
        data: {
          name: input.name,
          type: input.type,
          tableId: input.tableId,
          order: newOrder, // Place at the end
        },
      });
    }),

  // ============================================
  // UPDATE A COLUMN
  // ============================================
  // Frontend: const updateColumn = trpc.column.update.useMutation();
  //           updateColumn.mutate({ 
  //             id: "xxx", 
  //             name: "Full Name" 
  //           });
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      type: z.enum(["TEXT", "NUMBER"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Step 1: Verify column exists and user owns it
      const column = await ctx.db.column.findFirst({
        where: { id: input.id },
        include: { 
          table: { 
            include: { base: true } 
          } 
        },
      });

      if (!column || column.table.base.userId !== ctx.session.user.id) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Column not found" 
        });
      }

      // Step 2: Update the column
      return ctx.db.column.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.type && { type: input.type }),
        },
      });
    }),

  // ============================================
  // DELETE A COLUMN
  // ============================================
  // Frontend: const deleteColumn = trpc.column.delete.useMutation();
  //           deleteColumn.mutate({ id: "xxx" });
  // 
  // ⚠️ NOTE: When a column is deleted, all data for that column 
  // in the Row.data JSONB is orphaned (not automatically cleaned).
  // For 100k+ rows, it's faster to leave orphaned data than to 
  // update every row. You could add cleanup in a background job.
  delete: protectedProcedure
    .input(z.object({ 
      id: z.string() 
    }))
    .mutation(async ({ ctx, input }) => {
      // Step 1: Verify column exists and user owns it
      const column = await ctx.db.column.findFirst({
        where: { id: input.id },
        include: { 
          table: { 
            include: { base: true } 
          } 
        },
      });

      if (!column || column.table.base.userId !== ctx.session.user.id) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Column not found" 
        });
      }

      // Step 2: Delete the column
      // Cascade will NOT delete row data (it's JSONB, not relational)
      return ctx.db.column.delete({
        where: { id: input.id },
      });
    }),

  // TODO: Add column reordering later
  // This is a nice-to-have feature, not essential for MVP
});
