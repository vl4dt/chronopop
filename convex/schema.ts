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
  backups: defineTable({
    deviceId: v.string(),
    profilesJson: v.string(),
    remindersJson: v.string(),
    timestamp: v.number(),
  }).index("by_device", ["deviceId"]),
});
