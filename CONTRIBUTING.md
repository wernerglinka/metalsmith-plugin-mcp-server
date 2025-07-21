# Contributing to Metalsmith Plugin MCP Server

Thank you for your interest in contributing to the Metalsmith Plugin MCP Server! This document provides guidelines and best practices to help you contribute effectively to our project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Code of Conduct](#code-of-conduct)
- [Development Workflow](#development-workflow)
- [Communication Guidelines](#communication-guidelines)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Licensing](#licensing)

## Getting Started

Before contributing, please take time to understand the Metalsmith Plugin MCP Server project. This server enables AI assistants to help developers create, test, and maintain Metalsmith plugins through the Model Context Protocol (MCP).

### Understanding the Project Scope

The Metalsmith Plugin MCP Server aims to:

- Provide a seamless interface between AI assistants and Metalsmith plugin development
- Enable AI-powered plugin creation, testing, and modification
- Help developers build plugins that follow Metalsmith's conventions
- Follow functional programming principles

Please ensure your contributions align with these goals.

## Development Setup

To set up your development environment:

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/metalsmith-plugin-mcp-server.git
   cd metalsmith-plugin-mcp-server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests to ensure everything works:
   ```bash
   npm test
   ```

## How to Contribute

### Finding Issues

Look for issues labeled:

- `good first issue` - Great for newcomers
- `help wanted` - We need community assistance
- `documentation` - Help improve our docs
- `bug` - Fix something that's broken

If you're new to open source, start small with documentation improvements or simple bug fixes.

### Creating Issues

When creating an issue:

- Search existing issues first to avoid duplicates
- Use clear, descriptive titles
- Provide detailed descriptions with examples
- Include your environment details for bugs
- Add relevant labels

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. By participating in this project, you agree to abide by our Code of Conduct:

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, sexual identity and orientation, or any other characteristic.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Project maintainers are responsible for clarifying standards and are expected to take appropriate action in response to any instances of unacceptable behavior. Please report issues to the project maintainers.

## Development Workflow

1. **Fork and Branch**: Create a new branch for your feature or fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**: Keep changes focused and atomic. Each commit should represent one logical change.

3. **Write Tests**: Add tests for new functionality and ensure existing tests pass.

4. **Commit**: Write clear, concise commit messages:

   ```
   feat: add Metalsmith configuration validation

   - Add schema validation for metalsmith.json
   - Include helpful error messages
   - Update documentation
   ```

5. **Push and PR**: Push your branch and create a pull request with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots if applicable

## Communication Guidelines

### Being Effective

- Be respectful and considerate in all interactions
- Ask questions when unsure - we're here to help
- Provide context and be specific in discussions
- Be patient - maintainers volunteer their time

### Inclusive Language

We strive to use inclusive language throughout our project:

- Avoid terms that might exclude or offend
- Use gender-neutral pronouns (they/them) when gender is unknown
- Replace problematic terms (use "main" instead of "master", "allowlist" instead of "whitelist")
- Consider global audiences - avoid idioms that don't translate well

### Accessibility Considerations

When contributing:

- Ensure documentation is screen reader friendly
- Use semantic markup in documentation
- Provide alt text for images
- Consider users with different abilities when designing features

## Code Style

Follow our established code style:

- **JavaScript only** (no TypeScript)
- **JSDoc annotations** for type information
- **Functional programming** patterns
- **Pure functions** with explicit returns
- **No mutations** - create new objects/arrays
- **Descriptive names** - no abbreviations
- **Modular design** with dependency injection

Example:

```javascript
/**
 * Processes Metalsmith files with given plugins
 * @param {Object} files - Metalsmith files object
 * @param {Array} plugins - Array of plugin functions
 * @returns {Object} Processed files object
 */
const processFiles = (files, plugins) => {
  return plugins.reduce(
    (processedFiles, plugin) => {
      return plugin(processedFiles);
    },
    { ...files }
  );
};
```

## Testing

All contributions must include appropriate tests:

- We use **Mocha** for unit testing
- Aim for high test coverage
- Test edge cases and error conditions
- Keep tests focused and readable

Run tests with:

```bash
npm test
```

## Documentation

Good documentation is crucial:

- Update README.md if you change functionality
- Add JSDoc comments to all functions
- Include examples in documentation
- Keep language clear and concise

## Licensing

### Your Contributions

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License).

### Attribution

- We maintain a list of contributors
- Your contributions will be acknowledged
- Feel free to add yourself to the contributors list in your PR

### Third-Party Code

If you include code from other sources:

- Ensure it's compatible with our MIT License
- Provide proper attribution
- Document the source in your PR

## AI Assistance in This Project

This project uses Claude (by Anthropic) to assist with code generation, refactoring, and documentation. We believe in transparent AI use while maintaining high code quality standards.

### How We Use AI

AI assistance is primarily used for:

- Generating boilerplate code and repetitive patterns
- Refactoring existing code to match our functional programming standards
- Creating comprehensive JSDoc documentation
- Writing unit tests following our Mocha conventions
- Code reviews and identifying potential improvements

AI is **not** used for:

- Core architecture decisions
- Security-critical implementations without thorough review
- Business logic without human validation

### Our AI Coding Standards

All AI-generated code must adhere to our project preferences:

- **Languages**: JavaScript with JSDoc annotations (no TypeScript)
- **Paradigm**: Functional programming with pure functions and explicit returns
- **Architecture**: Modular design with dependency injection and separation of concerns
- **Documentation**: Comprehensive JSDoc comments with descriptive naming
- **Testing**: Mocha-based unit tests with high coverage

### For Contributors Using AI

If you use AI assistance for contributions:

1. Always review and understand generated code before committing
2. Test thoroughly - AI-generated code requires the same quality standards
3. Document in your PR if significant portions were AI-assisted
4. Follow our prompting patterns for consistency (see examples below)

### Example Prompting Patterns

When using Claude or similar tools, use prompts like:
"Create a validation module using functional programming patterns,
pure functions with explicit returns, dependency injection, and
comprehensive JSDoc documentation. Avoid mutations and side effects."

### Quality Assurance

All code, whether human or AI-assisted, goes through:

- Code review by maintainers
- Automated testing via our CI pipeline
- Manual testing for edge cases
- Documentation review

### Transparency

We believe in being open about AI use. The "AI Assisted: Claude" badge in our README links here to ensure all contributors and users understand our approach to AI assistance in development.
