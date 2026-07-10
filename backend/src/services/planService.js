"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProfileForPlan = exports.getLimit = exports.hasFeature = exports.getPlanForUser = void 0;

const Plan = require("../models/Plan").default;

const sections = ["contact", "social", "payment", "video", "music", "design", "gaming", "other"];

const getUserId = (user) => {
  if (typeof user === "string") return user;
  return user?._id || user?.id || null;
};

const getPlanForUser = async (userId) => {
  const id = getUserId(userId);
  if (!id) return null;
  return Plan.findForUser(id);
};
exports.getPlanForUser = getPlanForUser;

const resolvePlan = async (user) => {
  if (user?.plan?.features) return user.plan;
  if (user?.planId) return Plan.findById(user.planId);
  return getPlanForUser(user);
};

const hasFeature = async (user, featureKey) => {
  const plan = await resolvePlan(user);
  return Boolean(plan?.features?.[featureKey]);
};
exports.hasFeature = hasFeature;

const getLimit = async (user, featureKey) => {
  const plan = await resolvePlan(user);
  const value = plan?.features?.[featureKey];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
};
exports.getLimit = getLimit;

const profileEntries = (profile) => {
  const entries = [];
  for (const section of sections) {
    const values = profile?.[section];
    if (!values || typeof values !== "object") continue;

    if (Array.isArray(values)) {
      for (const item of values) {
        if (item?.key && item?.value !== undefined && item?.value !== null && String(item.value).trim() !== "") {
          entries.push({ section, key: String(item.key), value: String(item.value) });
        }
      }
      continue;
    }

    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        entries.push({ section, key: String(key), value: String(value) });
      }
    }
  }
  return entries;
};

const countByBaseType = (entries) => {
  const count = new Map();
  for (const entry of entries) {
    const baseType = entry.key.split("__")[0];
    count.set(baseType, (count.get(baseType) || 0) + 1);
  }
  return count;
};

const validateProfileForPlan = async (user, profile) => {
  const plan = await resolvePlan(user);
  if (!plan) return { feature: "canEditProfile" };

  const features = plan.features || {};
  const incomingEntries = profileEntries(profile);
  const currentEntries = profileEntries(user?.profile);
  const maxLinks = await getLimit(user, "maxLinks");

  // Existing links remain valid after a plan change; only an increase beyond the limit is blocked.
  if (maxLinks !== null && incomingEntries.length > maxLinks && incomingEntries.length > currentEntries.length) {
    return { feature: "maxLinks" };
  }

  if (features.allowDuplicateType === false) {
    const incomingCounts = countByBaseType(incomingEntries);
    const currentCounts = countByBaseType(currentEntries);
    for (const [baseType, count] of incomingCounts.entries()) {
      if (count > 1 && count > (currentCounts.get(baseType) || 0)) {
        return { feature: "allowDuplicateType" };
      }
    }
  }

  const blockedSections = Array.isArray(features.blockedSections) ? features.blockedSections : [];
  if (blockedSections.length) {
    const currentValues = new Set(currentEntries.map((entry) => `${entry.section}:${entry.key}:${entry.value}`));
    const addedBlockedEntry = incomingEntries.find(
      (entry) => blockedSections.includes(entry.section) && !currentValues.has(`${entry.section}:${entry.key}:${entry.value}`)
    );
    if (addedBlockedEntry) return { feature: "blockedSections" };
  }

  return null;
};
exports.validateProfileForPlan = validateProfileForPlan;
