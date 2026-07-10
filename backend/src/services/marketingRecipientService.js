"use strict";

const { pool } = require("../db/postgres");

const FILTER_KEYS = ["planId", "countryCode", "isAdmin", "createdFrom", "createdTo"];

const filterError = (message) => {
  const error = new Error(message);
  error.code = "MARKETING_FILTER_INVALID";
  return error;
};

const normalizeCountryCode = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits || digits.length > 4) throw filterError("countryCode must be a valid country calling code");
  return `+${digits}`;
};

const parseDate = (value, field) => {
  if (!value) return null;
  const rawValue = String(value);
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawValue);
  const date = new Date(isDateOnly ? `${rawValue}T00:00:00.000Z` : rawValue);
  if (Number.isNaN(date.getTime())) throw filterError(`${field} must be a valid date`);
  return date;
};

const normalizeFilters = (input = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw filterError("filters must be an object");
  }

  const filters = {};
  const planId = input.planId ?? input.plan;
  const countryCode = input.countryCode ?? input.country;

  if (planId !== undefined && planId !== null && String(planId).trim()) {
    const value = String(planId).trim();
    if (value.length > 200) throw filterError("planId is too long");
    filters.planId = value;
  }

  if (countryCode !== undefined && countryCode !== null && String(countryCode).trim()) {
    filters.countryCode = normalizeCountryCode(countryCode);
  }

  if (input.isAdmin !== undefined && input.isAdmin !== null && input.isAdmin !== "") {
    if (typeof input.isAdmin !== "boolean") throw filterError("isAdmin must be a boolean");
    filters.isAdmin = input.isAdmin;
  }

  const createdFrom = parseDate(input.createdFrom, "createdFrom");
  const createdTo = parseDate(input.createdTo, "createdTo");
  if (createdTo && /^\d{4}-\d{2}-\d{2}$/.test(String(input.createdTo))) {
    createdTo.setUTCHours(23, 59, 59, 999);
  }
  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw filterError("createdFrom cannot be after createdTo");
  }

  if (createdFrom) filters.createdFrom = createdFrom.toISOString();
  if (createdTo) filters.createdTo = createdTo.toISOString();

  // Only allow the documented whitelist to reach the database query.
  return FILTER_KEYS.reduce((out, key) => {
    if (filters[key] !== undefined) out[key] = filters[key];
    return out;
  }, {});
};

const formatWhatsAppRecipient = (phone, countryCode) => {
  let localDigits = String(phone || "").replace(/\D/g, "");
  const countryDigits = String(countryCode || "").replace(/\D/g, "");

  if (!localDigits || !countryDigits) return null;
  if (localDigits.startsWith("00")) localDigits = localDigits.slice(2);

  let recipient = localDigits;
  if (!localDigits.startsWith(countryDigits)) {
    recipient = `${countryDigits}${localDigits.replace(/^0+/, "")}`;
  }

  return recipient.length >= 8 && recipient.length <= 15 ? recipient : null;
};

const buildRecipient = (row) => {
  const whatsappPhone = formatWhatsAppRecipient(row.phone, row.country_code || "+20");
  if (!whatsappPhone) return null;
  return { id: row.id, whatsappPhone };
};

const resolveMarketingRecipients = async (inputFilters = {}) => {
  const filters = normalizeFilters(inputFilters);
  const where = ["COALESCE(BTRIM(phone), '') <> ''"];
  const values = [];

  if (filters.planId) {
    values.push(filters.planId);
    where.push(`plan_id = $${values.length}`);
  }
  if (filters.countryCode) {
    values.push(filters.countryCode);
    where.push(`country_code = $${values.length}`);
  }
  if (filters.isAdmin !== undefined) {
    values.push(filters.isAdmin);
    where.push(`is_admin = $${values.length}`);
  }
  if (filters.createdFrom) {
    values.push(filters.createdFrom);
    where.push(`created_at >= $${values.length}`);
  }
  if (filters.createdTo) {
    values.push(filters.createdTo);
    where.push(`created_at <= $${values.length}`);
  }

  const result = await pool.query(
    `SELECT id, phone, country_code
     FROM users
     WHERE ${where.join(" AND ")}
     ORDER BY created_at ASC`,
    values
  );

  return {
    filters,
    recipients: result.rows.map(buildRecipient).filter(Boolean),
  };
};

const findRecipientsByIds = async (ids) => {
  const normalizedIds = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter(Boolean))];
  if (!normalizedIds.length) return [];

  const result = await pool.query(
    "SELECT id, phone, country_code FROM users WHERE id = ANY($1::text[])",
    [normalizedIds]
  );
  return result.rows.map(buildRecipient).filter(Boolean);
};

module.exports = {
  normalizeFilters,
  resolveMarketingRecipients,
  findRecipientsByIds,
};
