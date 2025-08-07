/**
 * Path Security Utilities
 *
 * Provides functions to sanitize and validate file paths to prevent
 * path traversal vulnerabilities.
 */

import path from 'path';
import { promises as fs } from 'fs';

/**
 * Sanitize a file path to prevent path traversal attacks
 * @param {string} userPath - User-provided path
 * @param {string} basePath - Base directory to resolve within
 * @returns {string} Sanitized absolute path
 * @throws {Error} If the path attempts to traverse outside basePath
 */
export function sanitizePath(userPath, basePath) {
  if (!userPath || typeof userPath !== 'string') {
    throw new Error('Invalid path provided');
  }

  // Check for common path traversal patterns regardless of path type
  // This catches both Unix and Windows style traversal attempts
  if (
    userPath.includes('../') ||
    userPath.includes('..\\') ||
    userPath.includes('..\\\\') ||
    /\.\.[/\\]/.test(userPath)
  ) {
    throw new Error('Path traversal attempt detected');
  }

  // If the user path is already absolute, return normalized version
  if (path.isAbsolute(userPath)) {
    // Return the normalized absolute path
    return path.normalize(userPath);
  }

  // For relative paths, resolve relative to base and ensure no traversal
  const normalizedBase = path.resolve(basePath);
  const resolvedPath = path.resolve(normalizedBase, userPath);

  // Ensure the resolved path is within the base path
  if (!resolvedPath.startsWith(normalizedBase)) {
    throw new Error('Path traversal attempt detected');
  }

  return resolvedPath;
}

/**
 * Validate that a path exists and is within allowed boundaries
 * @param {string} userPath - User-provided path
 * @param {string} basePath - Base directory to validate within
 * @returns {Promise<string>} Validated absolute path
 * @throws {Error} If path is invalid or doesn't exist
 */
export async function validatePath(userPath, basePath) {
  const safePath = sanitizePath(userPath, basePath);

  try {
    await fs.access(safePath);
    return safePath;
  } catch {
    throw new Error(`Path does not exist: ${userPath}`);
  }
}

/**
 * Sanitize a template name to prevent path traversal in template lookups
 * @param {string} templateName - Template name
 * @returns {string} Sanitized template name
 * @throws {Error} If template name contains invalid characters
 */
export function sanitizeTemplateName(templateName) {
  if (!templateName || typeof templateName !== 'string') {
    throw new Error('Invalid template name provided');
  }

  // Remove any path traversal attempts
  const sanitized = templateName
    .replace(/\.\./g, '') // Remove ..
    .replace(/^[/\\]+/, '') // Remove leading slashes
    .replace(/[/\\]+/g, '/'); // Normalize path separators

  // Ensure the template name doesn't contain dangerous characters
  if (sanitized.includes('\0')) {
    throw new Error('Invalid template name: contains null bytes');
  }

  return sanitized;
}

/**
 * Create a safe path resolver for a specific base directory
 * @param {string} basePath - Base directory
 * @returns {Function} Path resolver function
 */
export function createPathResolver(basePath) {
  const normalizedBase = path.resolve(basePath);

  return {
    /**
     * Resolve a safe path relative to the base
     * @param {string} userPath - User-provided path
     * @returns {string} Resolved safe path
     */
    resolve: (userPath) => sanitizePath(userPath, normalizedBase),

    /**
     * Validate and resolve a path
     * @param {string} userPath - User-provided path
     * @returns {Promise<string>} Validated path
     */
    validate: (userPath) => validatePath(userPath, normalizedBase),

    /**
     * Get the base path
     * @returns {string} Base path
     */
    getBase: () => normalizedBase
  };
}
