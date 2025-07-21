import { expect } from 'chai';
import { renderTemplate, renderConditionals, render } from '../src/utils/render.js';

describe('render utilities', function () {
  describe('renderTemplate', function () {
    it('should replace simple variables', function () {
      const template = 'Hello {{ name }}!';
      const data = { name: 'World' };
      const result = renderTemplate(template, data);
      expect(result).to.equal('Hello World!');
    });

    it('should handle boolean values', function () {
      const template = 'Enabled: {{ enabled }}';
      const data = { enabled: true };
      const result = renderTemplate(template, data);
      expect(result).to.equal('Enabled: true');
    });

    it('should handle false boolean values', function () {
      const template = 'Enabled: {{ enabled }}';
      const data = { enabled: false };
      const result = renderTemplate(template, data);
      expect(result).to.equal('Enabled: false');
    });

    it('should handle array values', function () {
      const template = 'Items: {{ items }}';
      const data = { items: ['a', 'b', 'c'] };
      const result = renderTemplate(template, data);
      expect(result).to.equal('Items: a,b,c');
    });

    it('should handle empty arrays', function () {
      const template = 'Items: {{ items }}';
      const data = { items: [] };
      const result = renderTemplate(template, data);
      expect(result).to.equal('Items: ');
    });

    it('should leave unknown variables as empty string', function () {
      const template = 'Hello {{ name }}, age {{ age }}!';
      const data = { name: 'John' };
      const result = renderTemplate(template, data);
      expect(result).to.equal('Hello John, age !');
    });

    it('should handle numbers', function () {
      const template = 'Count: {{ count }}';
      const data = { count: 42 };
      const result = renderTemplate(template, data);
      expect(result).to.equal('Count: 42');
    });

    it('should handle multiple occurrences of same variable', function () {
      const template = '{{ name }} says hello to {{ name }}';
      const data = { name: 'Alice' };
      const result = renderTemplate(template, data);
      expect(result).to.equal('Alice says hello to Alice');
    });
  });

  describe('renderConditionals', function () {
    it('should include content when condition is true', function () {
      const template = '{% if enabled %}Feature is enabled{% endif %}';
      const data = { enabled: true };
      const result = renderConditionals(template, data);
      expect(result).to.equal('Feature is enabled');
    });

    it('should exclude content when condition is false', function () {
      const template = '{% if enabled %}Feature is enabled{% endif %}';
      const data = { enabled: false };
      const result = renderConditionals(template, data);
      expect(result).to.equal('');
    });

    it('should exclude content when condition is undefined', function () {
      const template = '{% if enabled %}Feature is enabled{% endif %}';
      const data = {};
      const result = renderConditionals(template, data);
      expect(result).to.equal('');
    });

    it('should handle multiline conditional content', function () {
      const template = `{% if hasFeature %}
// Feature code here
function feature() {
  return true;
}{% endif %}`;
      const data = { hasFeature: true };
      const result = renderConditionals(template, data);
      expect(result).to.include('Feature code here');
      expect(result).to.include('function feature()');
    });

    it('should handle multiple conditionals', function () {
      const template = '{% if a %}A{% endif %}{% if b %}B{% endif %}{% if c %}C{% endif %}';
      const data = { a: true, b: false, c: true };
      const result = renderConditionals(template, data);
      expect(result).to.equal('AC');
    });

    it('should handle nested content with variables', function () {
      const template = '{% if enabled %}Hello {{ name }}!{% endif %}';
      const data = { enabled: true, name: 'World' };
      const result = renderConditionals(template, data);
      // Nunjucks processes everything, including nested variables
      expect(result).to.equal('Hello World!');
    });

    it('should handle truthy values', function () {
      const template = '{% if value %}Has value{% endif %}';

      expect(renderConditionals(template, { value: 'string' })).to.equal('Has value');
      expect(renderConditionals(template, { value: 1 })).to.equal('Has value');
      // Nunjucks considers empty arrays as truthy (different from Handlebars)
      expect(renderConditionals(template, { value: [] })).to.equal('Has value');
      expect(renderConditionals(template, { value: {} })).to.equal('Has value');
    });

    it('should handle falsy values', function () {
      const template = '{% if value %}Has value{% endif %}';

      expect(renderConditionals(template, { value: '' })).to.equal('');
      expect(renderConditionals(template, { value: 0 })).to.equal('');
      expect(renderConditionals(template, { value: null })).to.equal('');
    });
  });

  describe('render (full rendering)', function () {
    it('should process both conditionals and variables', function () {
      const template = '{% if enabled %}Hello {{ name }}!{% endif %}';
      const data = { enabled: true, name: 'World' };
      const result = render(template, data);
      expect(result).to.equal('Hello World!');
    });

    it('should process conditionals before variables', function () {
      const template = '{% if show %}Value: {{ value }}{% endif %}';
      const data = { show: true, value: 42 };
      const result = render(template, data);
      expect(result).to.equal('Value: 42');
    });

    it('should handle complex template with both features', function () {
      const template = `
const config = {
  name: "{{ name }}"{% if hasOptions %},
  options: {
    debug: {{ debug }},
    features: {{ features }}
  }{% endif %}
};`;

      const data = {
        name: 'test-plugin',
        hasOptions: true,
        debug: true,
        features: ['a', 'b']
      };

      const result = render(template, data);
      expect(result).to.include('name: "test-plugin"');
      expect(result).to.include('debug: true');
      expect(result).to.include('features: a,b');
    });

    it('should handle empty data object', function () {
      const template = 'Hello {{ name }}! {% if enabled %}Enabled{% endif %}';
      const result = render(template, {});
      expect(result).to.equal('Hello ! ');
    });

    it('should handle template with no placeholders', function () {
      const template = 'This is a plain template with no variables.';
      const result = render(template, { unused: 'value' });
      expect(result).to.equal('This is a plain template with no variables.');
    });

    it('should handle array using join filter', function () {
      const template = "Items: {{ items | join(', ') }}";
      const data = { items: ['a', 'b', 'c'] };
      const result = render(template, data);
      expect(result).to.equal('Items: a, b, c');
    });

    it('should handle custom filters', function () {
      const template = "{{ 'metalsmith-test' | camelCase }}";
      const result = render(template, {});
      expect(result).to.equal('metalsmithTest');
    });

    it('should handle removePrefix filter', function () {
      const template = "{{ 'metalsmith-plugin' | removePrefix('metalsmith-') }}";
      const result = render(template, {});
      expect(result).to.equal('plugin');
    });

    it('should handle for loops', function () {
      const template = '{% for item in items %}{{ item }}{% if not loop.last %}, {% endif %}{% endfor %}';
      const data = { items: ['a', 'b', 'c'] };
      const result = render(template, data);
      expect(result).to.equal('a, b, c');
    });
  });
});
