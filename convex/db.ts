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

export const deleteReminder = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

export const updateProfile = mutation({
  args: { id: v.id("profiles"), name: v.string(), type: v.string(), colorKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { name: args.name, type: args.type, colorKey: args.colorKey });
  },
});

export const updateReminder = mutation({
  args: {
    id: v.id("reminders"),
    title: v.optional(v.string()),
    timeHour: v.optional(v.number()),
    timeMinute: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    completedToday: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    return await ctx.db.patch(id, patch);
  },
});

// --- Premium Device Sync (Backup/Restore) ---
export const syncPushOverwrite = mutation({
  args: { 
    deviceId: v.string(), 
    profilesJson: v.string(), 
    remindersJson: v.string() 
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("backups").withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        profilesJson: args.profilesJson,
        remindersJson: args.remindersJson,
        timestamp: Date.now()
      });
    } else {
      await ctx.db.insert("backups", {
        deviceId: args.deviceId,
        profilesJson: args.profilesJson,
        remindersJson: args.remindersJson,
        timestamp: Date.now()
      });
    }
  }
});

export const syncPull = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("backups").withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId)).first();
  }
});

// --- Alarms ---
export const getAlarms = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("alarms").withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId)).collect();
  },
});

export const createAlarm = mutation({
  args: { deviceId: v.string(), timeUnixMs: v.number(), enabled: v.boolean(), colorKey: v.string(), missionEnabled: v.boolean() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("alarms", args);
  },
});

export const updateAlarm = mutation({
  args: { id: v.id("alarms"), timeUnixMs: v.optional(v.number()), enabled: v.optional(v.boolean()), colorKey: v.optional(v.string()), missionEnabled: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    return await ctx.db.patch(id, patch);
  },
});

export const deleteAlarm = mutation({
  args: { id: v.id("alarms") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// --- Timers ---
export const getTimers = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("timers").withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId)).collect();
  },
});

export const createTimer = mutation({
  args: { 
    deviceId: v.string(), 
    name: v.string(), 
    colorKey: v.string(), 
    durationMs: v.number(), 
    isPomodoro: v.optional(v.boolean()),
    pomodoroWorkMs: v.optional(v.number()),
    pomodoroBreakMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("timers", {
      ...args,
      baseTimeMs: args.durationMs,
      isRunning: false,
      isFinished: false,
    });
  },
});

export const updateTimer = mutation({
  args: { 
    id: v.id("timers"), 
    name: v.optional(v.string()), 
    colorKey: v.optional(v.string()), 
    durationMs: v.optional(v.number()),
    pomodoroState: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    // If duration changes, we might need to reset baseTimeMs if not running
    const existing = await ctx.db.get(id);
    if (existing && !existing.isRunning && patch.durationMs !== undefined) {
      return await ctx.db.patch(id, { ...patch, baseTimeMs: patch.durationMs });
    }
    return await ctx.db.patch(id, patch);
  },
});

export const toggleTimer = mutation({
  args: { id: v.id("timers"), isRunning: v.boolean() },
  handler: async (ctx, args) => {
    const timer = await ctx.db.get(args.id);
    if (!timer) return;
    const now = Date.now();

    if (args.isRunning) {
      // Starting/Resuming
      await ctx.db.patch(args.id, {
        isRunning: true,
        startTimeMs: now,
      });
    } else {
      // Pausing
      if (timer.isRunning && timer.startTimeMs) {
        const elapsed = now - timer.startTimeMs;
        const newBaseTime = Math.max(0, timer.baseTimeMs - elapsed);
        await ctx.db.patch(args.id, {
          isRunning: false,
          baseTimeMs: newBaseTime,
          startTimeMs: undefined,
          isFinished: newBaseTime === 0,
        });
      }
    }
  },
});

export const resetTimer = mutation({
  args: { id: v.id("timers") },
  handler: async (ctx, args) => {
    const timer = await ctx.db.get(args.id);
    if (!timer) return;
    await ctx.db.patch(args.id, {
      isRunning: false,
      isFinished: false,
      baseTimeMs: timer.durationMs,
      startTimeMs: undefined,
    });
  },
});

export const deleteTimer = mutation({
  args: { id: v.id("timers") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// --- Stopwatches ---
export const getStopwatches = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("stopwatches").withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId)).collect();
  },
});

export const createStopwatch = mutation({
  args: { deviceId: v.string(), name: v.string(), colorKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("stopwatches", {
      deviceId: args.deviceId,
      name: args.name,
      colorKey: args.colorKey,
      baseTimeMs: 0,
      isRunning: false,
    });
  },
});

export const updateStopwatch = mutation({
  args: { id: v.id("stopwatches"), name: v.optional(v.string()), colorKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    return await ctx.db.patch(id, patch);
  },
});

export const toggleStopwatch = mutation({
  args: { id: v.id("stopwatches"), isRunning: v.boolean() },
  handler: async (ctx, args) => {
    const sw = await ctx.db.get(args.id);
    if (!sw) return;
    const now = Date.now();

    if (args.isRunning) {
      await ctx.db.patch(args.id, {
        isRunning: true,
        startTimeMs: now,
      });
    } else {
      if (sw.isRunning && sw.startTimeMs) {
        const elapsed = now - sw.startTimeMs;
        await ctx.db.patch(args.id, {
          isRunning: false,
          baseTimeMs: sw.baseTimeMs + elapsed,
          startTimeMs: undefined,
        });
      }
    }
  },
});

export const resetStopwatch = mutation({
  args: { id: v.id("stopwatches") },
  handler: async (ctx, args) => {
    // Also delete laps
    const laps = await ctx.db.query("stopwatchLaps").withIndex("by_stopwatch", (q: any) => q.eq("stopwatchId", args.id)).collect();
    for (const lap of laps) {
      await ctx.db.delete(lap._id);
    }
    await ctx.db.patch(args.id, {
      isRunning: false,
      baseTimeMs: 0,
      startTimeMs: undefined,
    });
  },
});

export const deleteStopwatch = mutation({
  args: { id: v.id("stopwatches") },
  handler: async (ctx, args) => {
    // Also delete laps
    const laps = await ctx.db.query("stopwatchLaps").withIndex("by_stopwatch", (q: any) => q.eq("stopwatchId", args.id)).collect();
    for (const lap of laps) {
      await ctx.db.delete(lap._id);
    }
    return await ctx.db.delete(args.id);
  },
});

export const addStopwatchLap = mutation({
  args: { stopwatchId: v.id("stopwatches"), timeMs: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("stopwatchLaps", {
      stopwatchId: args.stopwatchId,
      timeMs: args.timeMs,
      timestamp: Date.now(),
    });
  },
});

export const getStopwatchLaps = query({
  args: { stopwatchId: v.id("stopwatches") },
  handler: async (ctx, args) => {
    return await ctx.db.query("stopwatchLaps")
      .withIndex("by_stopwatch", (q: any) => q.eq("stopwatchId", args.stopwatchId))
      .order("desc")
      .collect();
  },
});

// --- World Clocks ---
export const getWorldClocks = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("worldClocks")
      .withIndex("by_device", (q: any) => q.eq("deviceId", args.deviceId))
      .collect();
  },
});

export const createWorldClock = mutation({
  args: { deviceId: v.string(), name: v.string(), timezone: v.string(), colorKey: v.string(), order: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("worldClocks", args);
  },
});

export const updateWorldClock = mutation({
  args: { id: v.id("worldClocks"), name: v.optional(v.string()), colorKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    return await ctx.db.patch(id, patch);
  },
});

export const deleteWorldClock = mutation({
  args: { id: v.id("worldClocks") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

export const reorderWorldClocks = mutation({
  args: { 
    shifts: v.array(v.object({ id: v.id("worldClocks"), order: v.number() })) 
  },
  handler: async (ctx, args) => {
    for (const shift of args.shifts) {
      await ctx.db.patch(shift.id, { order: shift.order });
    }
  },
});

export const getServerTime = query({
  args: {},
  handler: async () => {
    return Date.now();
  },
});
