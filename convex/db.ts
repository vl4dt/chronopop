import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// --- Profiles ---
export const getProfiles = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("profiles").withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId)).collect();
  },
});

export const createProfile = mutation({
  args: { deviceId: v.string(), name: v.string(), type: v.string(), colorKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("profiles", args);
  },
});

export const removeProfile = mutation({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// --- Reminders ---
export const getReminders = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("reminders").withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId)).collect();
  },
});

export const saveReminder = mutation({
  args: { 
    deviceId: v.string(),
    profileId: v.id("profiles"), 
    title: v.string(), 
    timeHour: v.number(), 
    timeMinute: v.number(),
    durationMinutes: v.optional(v.number()),
    completedToday: v.boolean()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reminders", args);
  },
});

export const markReminderComplete = mutation({
  args: { id: v.id("reminders"), completed: v.boolean(), deviceId: v.string() },
  handler: async (ctx, args) => {
    // Also track stats
    if (args.completed) {
      await updateStats(ctx, { deviceId: args.deviceId, addedTreatments: 1, addedFocus: 0 });
    }
    return await ctx.db.patch(args.id, { completedToday: args.completed });
  },
});

// --- Aggregated Stats ---
export const getGlobalStats = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const stats = await ctx.db.query("stats").withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId)).first();
    if (!stats) return { totalFocusMinutes: 0, treatmentsCompleted: 0 };
    return stats;
  },
});

const updateStats = async (ctx: any, args: { deviceId: string; addedTreatments: number; addedFocus: number }) => {
  const stats = await ctx.db.query("stats").withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId)).first();
  if (!stats) {
    await ctx.db.insert("stats", { 
      deviceId: args.deviceId,
      totalFocusMinutes: args.addedFocus, 
      treatmentsCompleted: args.addedTreatments 
    });
  } else {
    await ctx.db.patch(stats._id, {
      totalFocusMinutes: stats.totalFocusMinutes + args.addedFocus,
      treatmentsCompleted: stats.treatmentsCompleted + args.addedTreatments
    });
  }
};

export const logFocusSession = mutation({
  args: { deviceId: v.string(), minutes: v.number() },
  handler: async (ctx, args) => {
    await updateStats(ctx, { deviceId: args.deviceId, addedTreatments: 0, addedFocus: args.minutes });
  }
});

export const seedInitialData = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("profiles").withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId)).first();
    if (existing) return; // Already seeded for this device

    const p1Id = await ctx.db.insert("profiles", { deviceId: args.deviceId, name: 'Me', type: 'Person', colorKey: 'sapphire' });
    const p2Id = await ctx.db.insert("profiles", { deviceId: args.deviceId, name: 'Luna (Cat)', type: 'Pet', colorKey: 'rosewater' });

    await ctx.db.insert("reminders", { deviceId: args.deviceId, profileId: p1Id, title: 'Stretch / Yoga', timeHour: 8, timeMinute: 0, durationMinutes: 15, completedToday: false });
    await ctx.db.insert("reminders", { deviceId: args.deviceId, profileId: p2Id, title: 'Heartworm Pill', timeHour: 10, timeMinute: 0, completedToday: true });
    await ctx.db.insert("reminders", { deviceId: args.deviceId, profileId: p2Id, title: 'Nebulizer Therapy', timeHour: 18, timeMinute: 30, durationMinutes: 10, completedToday: false });
  }
});
