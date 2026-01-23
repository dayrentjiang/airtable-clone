import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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
      where: { userId: ctx.session.user.id },
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
        where: { id: input.id, userId: ctx.session.user.id },
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
  //           createBase.mutate({ name: "My Base" });
  // This is a "mutation" = write operation (like POST/PUT/DELETE)
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      return ctx.db.base.create({
        data: {
          name: input.name,
          userId: ctx.session.user.id,
        },
      });
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
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Base not found" });
      }

      return ctx.db.base.delete({ where: { id: input.id } });
    }),
});
