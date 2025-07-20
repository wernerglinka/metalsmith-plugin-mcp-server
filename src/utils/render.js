/**
 * Template Rendering Utilities
 *
 * These functions provide simple template rendering for our plugin generation.
 * We use a lightweight approach instead of a full template engine to minimize dependencies.
 *
 * Template syntax:
 * - {{variableName}} - Simple variable substitution
 * - {{#if condition}}content{{/if}} - Conditional blocks
 */

/**
 * Simple template renderer
 *
 * Replaces {{variable}} placeholders with values from data object.
 * This is the core rendering function that handles variable substitution.
 *
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} data - Data object containing replacement values
 * @returns {string} Rendered template with variables substituted
 */
export function renderTemplate(template, data) {
  // Use regex to find all {{variableName}} patterns and replace them
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in data) {
      const value = data[key];

      // Handle different data types appropriately
      if (typeof value === "boolean") {
        return value.toString(); // Convert true/false to 'true'/'false'
      }
      if (Array.isArray(value)) {
        return value.join(", "); // Join arrays with commas
      }
      return value; // Return strings and numbers as-is
    }
    return match; // If variable not found, leave placeholder unchanged
  });
}

/**
 * Render conditional sections in template
 *
 * Handles {{#if condition}}content{{/if}} blocks for conditional rendering.
 * This allows us to include/exclude sections based on feature flags.
 *
 * @param {string} template - Template string with conditional blocks
 * @param {Object} data - Data object containing condition values
 * @returns {string} Rendered template with conditionals processed
 */
export function renderConditionals(template, data) {
  // Regex explanation:
  // \{\{#if\s+(\w+)\}\} - Matches {{#if variableName}}
  // ([\s\S]*?) - Captures any content (including newlines) non-greedily
  // \{\{\/if\}\} - Matches {{/if}}
  return template.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, condition, content) => {
      if (data[condition]) {
        return content; // Include content if condition is truthy
      }
      return ""; // Remove block if condition is falsy
    },
  );
}

/**
 * Full template rendering with all features
 *
 * Combines both conditional rendering and variable substitution.
 * Process order is important: conditionals first, then variables.
 *
 * @param {string} template - Template string with conditionals and variables
 * @param {Object} data - Data object containing all template values
 * @returns {string} Fully rendered template
 */
export function render(template, data) {
  let result = template;

  // Step 1: Process conditionals ({{#if}}...{{/if}})
  result = renderConditionals(result, data);

  // Step 2: Process variable substitutions ({{variable}})
  result = renderTemplate(result, data);

  return result;
}

// Note: render is already exported above as a function declaration
// No additional exports needed
