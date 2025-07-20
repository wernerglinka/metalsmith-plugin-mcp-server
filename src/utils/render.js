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
 * Replaces {{variable}} and {{variable.method()}} placeholders with values from data object.
 * This supports both simple variables and basic method calls.
 *
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} data - Data object containing replacement values
 * @returns {string} Rendered template with variables substituted
 */
export function renderTemplate(template, data) {
  // First handle complex expressions like {{variable.method()}}
  template = template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    try {
      // Handle simple variables first
      if (/^\w+$/.test(expression)) {
        const key = expression;
        if (key in data) {
          const value = data[key];
          if (typeof value === "boolean") {
            return value.toString();
          }
          if (Array.isArray(value)) {
            return value.join(", ");
          }
          return value;
        }
        return match;
      }

      // Handle method calls like pluginName.replace('metalsmith-', '')
      if (expression.includes(".")) {
        const parts = expression.split(".");
        const varName = parts[0];

        if (varName in data) {
          let value = data[varName];

          // Handle method chain
          for (let i = 1; i < parts.length; i++) {
            const methodPart = parts[i];

            // Handle method calls with parameters
            if (methodPart.includes("(")) {
              const methodMatch = methodPart.match(/(\w+)\(([^)]*)\)/);
              if (methodMatch) {
                const methodName = methodMatch[1];
                const argsString = methodMatch[2];

                // Parse arguments (simple string parsing)
                const args = argsString
                  .split(",")
                  .map((arg) => arg.trim())
                  .filter((arg) => arg)
                  .map((arg) => {
                    // Remove quotes from string literals
                    if (
                      (arg.startsWith('"') && arg.endsWith('"')) ||
                      (arg.startsWith("'") && arg.endsWith("'"))
                    ) {
                      return arg.slice(1, -1);
                    }
                    return arg;
                  });

                if (typeof value[methodName] === "function") {
                  value = value[methodName](...args);
                }
              }
            } else {
              // Simple property access
              value = value[methodPart];
            }
          }

          return value;
        }
      }

      return match;
    } catch {
      // If evaluation fails, leave the placeholder
      return match;
    }
  });

  return template;
}

/**
 * Render conditional sections in template
 *
 * Handles {{#if condition}}content{{/if}} blocks for conditional rendering.
 * This allows us to include/exclude sections based on feature flags and comparisons.
 *
 * @param {string} template - Template string with conditional blocks
 * @param {Object} data - Data object containing condition values
 * @returns {string} Rendered template with conditionals processed
 */
export function renderConditionals(template, data) {
  // Handle more complex conditionals like {{#if pluginType === 'processor'}}
  return template.replace(
    /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, condition, content) => {
      try {
        let result = false;

        // Handle simple variable check
        if (/^\w+$/.test(condition.trim())) {
          result = !!data[condition.trim()];
        } else if (condition.includes("===")) {
          const [left, right] = condition.split("===").map((s) => s.trim());
          const leftValue = evaluateExpression(left, data);
          const rightValue = evaluateExpression(right, data);
          result = leftValue === rightValue;
        } else if (condition.includes("!==")) {
          const [left, right] = condition.split("!==").map((s) => s.trim());
          const leftValue = evaluateExpression(left, data);
          const rightValue = evaluateExpression(right, data);
          result = leftValue !== rightValue;
        } else if (condition.includes("==")) {
          const [left, right] = condition.split("==").map((s) => s.trim());
          const leftValue = evaluateExpression(left, data);
          const rightValue = evaluateExpression(right, data);
          result = leftValue === rightValue;
        } else {
          result = !!evaluateExpression(condition, data);
        }

        return result ? content : "";
      } catch {
        // If evaluation fails, don't include the content
        return "";
      }
    },
  );
}

/**
 * Evaluate a simple expression in the context of template data
 *
 * @param {string} expression - The expression to evaluate
 * @param {Object} data - Template data
 * @returns {any} The evaluated result
 */
function evaluateExpression(expression, data) {
  expression = expression.trim();

  // Handle string literals
  if (
    (expression.startsWith('"') && expression.endsWith('"')) ||
    (expression.startsWith("'") && expression.endsWith("'"))
  ) {
    return expression.slice(1, -1);
  }

  // Handle variables
  if (/^\w+$/.test(expression)) {
    return data[expression];
  }

  // Handle property access and method calls
  if (expression.includes(".")) {
    const parts = expression.split(".");
    let value = data[parts[0]];

    for (let i = 1; i < parts.length; i++) {
      if (value === null || value === undefined) {
        return undefined;
      }

      const part = parts[i];

      // Handle array.length
      if (part === "length" && Array.isArray(value)) {
        value = value.length;
      } else if (part.includes("(")) {
        const methodMatch = part.match(/(\w+)\(([^)]*)\)/);
        if (methodMatch) {
          const methodName = methodMatch[1];
          const argsString = methodMatch[2];

          // Parse arguments
          const args = argsString
            .split(",")
            .map((arg) => arg.trim())
            .filter((arg) => arg)
            .map((arg) => {
              if (
                (arg.startsWith('"') && arg.endsWith('"')) ||
                (arg.startsWith("'") && arg.endsWith("'"))
              ) {
                return arg.slice(1, -1);
              }
              return arg;
            });

          if (typeof value[methodName] === "function") {
            value = value[methodName](...args);
          } else {
            return undefined;
          }
        }
      } else if (value && typeof value === "object") {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  return expression;
}

/**
 * Render each loops in template
 *
 * Handles {{#each array}}content{{/each}} blocks for iteration.
 *
 * @param {string} template - Template string with each blocks
 * @param {Object} data - Data object containing arrays
 * @returns {string} Rendered template with loops processed
 */
export function renderEach(template, data) {
  return template.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, arrayName, content) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) {
        return "";
      }

      return array
        .map((item, index) => {
          let itemContent = content;

          // Replace {{this}} with current item
          itemContent = itemContent.replace(/\{\{this\}\}/g, item);

          // Replace {{@index}} with current index
          itemContent = itemContent.replace(/\{\{@index\}\}/g, index);

          // Replace {{@first}} and {{@last}} with boolean flags
          itemContent = itemContent.replace(/\{\{@first\}\}/g, index === 0);
          itemContent = itemContent.replace(
            /\{\{@last\}\}/g,
            index === array.length - 1,
          );

          // Handle {{#unless @last}} conditions
          itemContent = itemContent.replace(
            /\{\{#unless\s+@last\}\}(.*?)\{\{\/unless\}\}/g,
            (match, unlessContent) => {
              return index !== array.length - 1 ? unlessContent : "";
            },
          );

          return itemContent;
        })
        .join("");
    },
  );
}

/**
 * Full template rendering with all features
 *
 * Combines conditionals, loops, and variable substitution.
 * Process order is important: each loops first, then conditionals, then variables.
 *
 * @param {string} template - Template string with all template features
 * @param {Object} data - Data object containing all template values
 * @returns {string} Fully rendered template
 */
export function render(template, data) {
  let result = template;

  // Step 1: Process each loops ({{#each}}...{{/each}})
  result = renderEach(result, data);

  // Step 2: Process conditionals ({{#if}}...{{/if}})
  result = renderConditionals(result, data);

  // Step 3: Process variable substitutions ({{variable}})
  result = renderTemplate(result, data);

  return result;
}

// Note: render is already exported above as a function declaration
// No additional exports needed
