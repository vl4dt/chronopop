import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    deviceId: v.string(),
    name: v.string(),
    type: v.string(), // 'Person' | 'Pet'
    colorKey: v.string(),
  }).index("by_device", ["deviceId"]),
  reminders: defineTable({
    deviceId: v.string(),
    profileId: v.id("profiles"),
    title: v.string(),
    timeHour: v.number(),
    timeMinute: v.number(),
    durationMinutes: v.optional(v.number()),
    completedToday: v.boolean(),
  }).index("by_device", ["deviceId"]),
  alarms: defineTable({
    deviceId: v.string(),
    timeUnixMs: v.number(),
    enabled: v.boolean(),
    colorKey: v.string(),
    missionEnabled: v.boolean(),
  }).index("by_device", ["deviceId"]),
  stats: defineTable({
    deviceId: v.string(),
    totalFocusMinutes: v.number(),
    treatmentsCompleted: v.number(),
  }).index("by_device", ["deviceId"]),
  timers: defineTable({
    deviceId: v.string(),
    name: v.string(),
    colorKey: v.string(),
    durationMs: v.number(),
    startTimeMs: v.optional(v.number()),
    baseTimeMs: v.number(),
    isRunning: v.boolean(),
    isFinished: v.boolean(),
    isPomodoro: v.optional(v.boolean()),
    pomodoroState: v.optional(v.string()), // 'work' | 'break'
    pomodoroWorkMs: v.optional(v.number()),
    pomodoroBreakMs: v.optional(v.number()),
  }).index("by_device", ["deviceId"]),
  stopwatches: defineTable({
    deviceId: v.string(),
    name: v.string(),
    colorKey: v.string(),
    startTimeMs: v.optional(v.number()),
    baseTimeMs: v.number(),
    isRunning: v.boolean(),
  }).index("by_device", ["deviceId"]),
  stopwatchLaps: defineTable({
    stopwatchId: v.id("stopwatches"),
    timeMs: v.number(),
    timestamp: v.number(),
  }).index("by_stopwatch", ["stopwatchId"]),
  worldClocks: defineTable({
    deviceId: v.string(),
    name: v.string(),
    timezone: v.string(),
    colorKey: v.string(),
    order: v.number(),
  }).index("by_device", ["deviceId"]),
  backups: defineTable({
    deviceId: v.string(),
    profilesJson: v.string(),
    remindersJson: v.string(),
    timestamp: v.number(),
  }).index("by_device", ["deviceId"]),
  sync_profiles: defineTable({
    deviceId: v.string(),
    isPro: v.boolean(),
    updatedAt: v.number(),
  }).index("by_device", ["deviceId"]),
});
