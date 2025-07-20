/**
 * Template Rendering Utilities
 *
 * Uses Handlebars for proper template processing with full support for
 * conditionals, loops, helpers, and complex expressions.
 */

import Handlebars from "handlebars";

/**
 * Register custom Handlebars helpers for plugin template processing
 */
function registerHelpers() {
  // Helper for equality comparison
  Handlebars.registerHelper("eq", (a, b) => a === b);

  // Helper for inequality comparison
  Handlebars.registerHelper("neq", (a, b) => a !== b);

  // Helper to check if array includes value
  Handlebars.registerHelper(
    "includes",
    (arr, val) => Array.isArray(arr) && arr.includes(val),
  );

  // Helper to convert string to camelCase
  Handlebars.registerHelper("camelCase", (str) => {
    if (typeof str !== "string") {
      return str;
    }
    return str
      .split("-")
      .map((word, index) =>
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join("");
  });

  // Helper to remove prefix from string
  Handlebars.registerHelper("removePrefix", (str, prefix) => {
    if (typeof str !== "string" || typeof prefix !== "string") {
      return str;
    }
    return str.startsWith(prefix) ? str.slice(prefix.length) : str;
  });

  // Helper to convert array to comma-separated string
  Handlebars.registerHelper("join", (arr, separator = ", ") => {
    if (!Array.isArray(arr)) {
      return "";
    }
    return arr.join(separator);
  });

  // Helper to get array length
  Handlebars.registerHelper("length", (arr) => {
    if (Array.isArray(arr)) {
      return arr.length;
    }
    if (typeof arr === "string") {
      return arr.length;
    }
    return 0;
  });
}

// Register helpers on module load
registerHelpers();

// Configure Handlebars to preserve undefined variables
Handlebars.registerHelper("helperMissing", function (/* arguments, options */) {
  const options = arguments[arguments.length - 1];
  return new Handlebars.SafeString(`{{${options.name}}}`);
});

/**
 * Render template using Handlebars
 *
 * @param {string} template - Template string with Handlebars syntax
 * @param {Object} data - Data object containing template variables
 * @returns {string} Rendered template
 */
export function render(template, data) {
  try {
    // Pre-process data to handle arrays (convert to comma-separated strings)
    const processedData = {};
    for (const key in data) {
      if (Array.isArray(data[key])) {
        processedData[key] = data[key].join(", ");
      } else {
        processedData[key] = data[key];
      }
    }

    // Enhance data with computed properties for common template needs
    const enhancedData = {
      ...processedData,
      // Add short plugin name (without metalsmith- prefix)
      pluginNameShort: data.pluginName
        ? data.pluginName.replace("metalsmith-", "")
        : "",
      // Add camelCase function name
      functionName: data.pluginName
        ? data.pluginName
            .replace("metalsmith-", "")
            .split("-")
            .map((word, index) =>
              index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
            )
            .join("")
        : "",
      // Add feature flags as boolean properties
      ...(data.features
        ? data.features.reduce((acc, feature) => {
            acc[
              `has${feature
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join("")}`
            ] = true;
            return acc;
          }, {})
        : {}),
      // Current year for copyright
      year: new Date().getFullYear(),
    };

    // Create a special Handlebars instance for this render
    const instance = Handlebars.create();

    // Copy all registered helpers to the new instance
    Object.keys(Handlebars.helpers).forEach((name) => {
      if (name !== "helperMissing") {
        instance.registerHelper(name, Handlebars.helpers[name]);
      }
    });

    // Override helperMissing to preserve undefined variables
    instance.registerHelper("helperMissing", function () {
      const options = arguments[arguments.length - 1];
      return new instance.SafeString(`{{${options.name}}}`);
    });

    const compiledTemplate = instance.compile(template);
    return compiledTemplate(enhancedData);
  } catch (error) {
    throw new Error(`Template rendering failed: ${error.message}`);
  }
}

// Legacy function exports for backward compatibility
export function renderTemplate(template, data) {
  return render(template, data);
}

export function renderConditionals(template, data) {
  // For test compatibility: only process conditionals, not variables
  try {
    const instance = Handlebars.create();

    // Register only the conditional helpers
    instance.registerHelper("eq", (a, b) => a === b);
    instance.registerHelper("neq", (a, b) => a !== b);

    // Override helperMissing to preserve variable placeholders
    instance.registerHelper("helperMissing", function () {
      const options = arguments[arguments.length - 1];
      // For conditionals test, we want to preserve the {{variable}} syntax
      return new instance.SafeString(`{{${options.name}}}`);
    });

    // Don't process arrays or enhance data for conditional-only rendering
    const compiledTemplate = instance.compile(template);
    return compiledTemplate(data);
  } catch {
    // Fallback to the full render if there's an error
    return render(template, data);
  }
}

export function renderEach(template, data) {
  return render(template, data);
}

// Note: render is already exported above as a function declaration
// No additional exports needed
