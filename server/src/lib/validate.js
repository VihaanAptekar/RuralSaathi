'use strict';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function bad(message) {
  return new HttpError(400, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function bodyObject(req) {
  if (!isPlainObject(req.body)) throw bad('Request body must be a JSON object');
  return req.body;
}

function string(body, key, { optional = false, maxLength = 200 } = {}) {
  const value = body[key];
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw bad(`${key} must be a non-empty string`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) throw bad(`${key} must be at most ${maxLength} characters`);
  return normalized;
}

function number(body, key, { optional = false, integer = false, min, max, minExclusive = false } = {}) {
  const value = body[key];
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw bad(`${key} must be a finite number`);
  if (integer && !Number.isInteger(value)) throw bad(`${key} must be an integer`);
  if (min !== undefined && (minExclusive ? value <= min : value < min)) {
    throw bad(`${key} must be ${minExclusive ? 'greater than' : 'at least'} ${min}`);
  }
  if (max !== undefined && value > max) throw bad(`${key} must be at most ${max}`);
  return value;
}

function oneOf(body, key, choices, { optional = false } = {}) {
  const value = body[key];
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'string' || !choices.includes(value)) {
    throw bad(`${key} must be one of: ${choices.join(', ')}`);
  }
  return value;
}

function date(body, key, { optional = false } = {}) {
  const value = body[key];
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw bad(`${key} must be a valid date in YYYY-MM-DD format`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw bad(`${key} must be a valid date in YYYY-MM-DD format`);
  }
  return value;
}

function idParam(value, label = 'id') {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw bad(`${label} must be a positive integer`);
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw bad(`${label} is out of range`);
  return id;
}

module.exports = { HttpError, bad, isPlainObject, bodyObject, string, number, oneOf, date, idParam };