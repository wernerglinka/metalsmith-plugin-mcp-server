# Instructions for AI Assistants Using metalsmith-plugin-mcp-server

## IMPORTANT: Follow These Rules Exactly

### 1. Plugin Naming

- **ALWAYS use the exact name provided by the user**
- Do NOT automatically add 'metalsmith-' prefix
- If the user says "create plugin-reverse-titles", create "plugin-reverse-titles", not "metalsmith-plugin-reverse-titles"
- If the user says "create reverse-titles", create "reverse-titles", not "metalsmith-reverse-titles"
- The tool will warn about naming conventions but will not enforce them
- Only suggest the 'metalsmith-' convention if appropriate, don't enforce it

### 2. Plugin Description

- **ALWAYS ask for the plugin's purpose before creating it**
- Do NOT infer functionality from the plugin name
- The description parameter is now REQUIRED
- Ask questions like:
  - "What should the reverse-titles plugin do?"
  - "Can you describe how this plugin should work?"
  - "What functionality do you want this plugin to provide?"

### 3. Working Directory and Paths

- **ALWAYS verify the current working directory before file operations**
- The plugin is created in: `outputPath/pluginName/`
- After creation, the plugin directory structure is:
  ```
  outputPath/
  └── pluginName/
      ├── src/
      │   └── index.js
      ├── test/
      │   ├── index.test.js
      │   └── index.test.cjs
      ├── package.json
      ├── README.md
      └── ... (other files)
  ```
- Pay attention to the path information returned by the tool:
  - "Plugin created at: /absolute/path"
  - "Relative path: relative/path"
  - "Working directory: /current/working/directory"

### 4. Required Parameters

When calling the plugin-scaffold tool, these parameters are required:

- `name`: Exact plugin name (as provided by user)
- `description`: What the plugin does (ask the user!)

Optional parameters:

- `features`: Array of features like ['async-processing', 'metadata-generation']
- `outputPath`: Where to create the plugin (default: '.')
- `author`: Plugin author (default: 'Your Name')
- `license`: Plugin license (default: 'MIT')

### 5. File Operations After Scaffolding

- When working with files after scaffolding, ensure you're in the correct directory
- The scaffold tool creates the complete structure - don't recreate directories
- Use the path information from the scaffold response to navigate correctly

### 6. Example Interaction Flow

**Bad:**

```
User: "Create a plugin to reverse page titles"
AI: Creates "metalsmith-reverse-titles" with auto-generated description
```

**Good:**

```
User: "Create a plugin to reverse page titles"
AI: "What should this plugin be called? And can you describe exactly how it should work with the page titles?"
User: "Call it 'title-reverser' and it should reverse the order of words in page titles"
AI: Calls plugin-scaffold with name="title-reverser", description="Reverses the order of words in page titles"
```

### 7. Error Handling

- If the tool returns an error about missing description, ask the user for clarification
- If there are path issues, check the working directory context
- If naming convention warnings appear, explain them to the user but proceed with their choice

### 8. Template Usage

- Always use the latest templates provided by the MCP server
- Don't cache or remember old template content
- The templates are automatically updated and current

## Common Mistakes to Avoid

1. ❌ Adding 'metalsmith-' prefix automatically
2. ❌ Generating description from plugin name
3. ❌ Assuming plugin functionality without asking
4. ❌ Creating nested directories incorrectly
5. ❌ Using outdated template information
6. ❌ Ignoring the path context in responses

## Best Practices

1. ✅ Always ask "What should [plugin-name] do?" before creating
2. ✅ Use the exact name the user provides
3. ✅ Pay attention to path information in responses
4. ✅ Explain the naming convention but respect user choice
5. ✅ Use the working directory context for follow-up operations
