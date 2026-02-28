# Exported Prompts

These markdown files contain the AI prompts used for brandbook generation, draft post generation, and image generation. You can edit them to tune behavior, then sync changes back into the codebase.

## Files

| File | Purpose | Code location |
|------|---------|----------------|
| `brandbook.md` | Brandbook generation from brand info + reference images | `lib/ai/gemini.ts` → `generateBrandbook()` |
| `draft-post.md` | Single-image and carousel draft generation | `lib/ai/gemini.ts` → `generatePost()` |
| `image-generation.md` | Final image prompt builder | `lib/ai/build-image-prompt.ts` → `buildImagePrompt()` |

## Using as Cursor Skills

Cursor skills are reusable instructions stored as markdown. To turn these prompts into skills:

1. **Where to store**: `.cursor/rules/` or a dedicated `skills/` folder in your project.
2. **Format**: Create a `.mdc` file (e.g. `brandbook-skill.mdc`) with:
   - Optional `globs` to scope when the skill applies
   - The prompt content as the body

Example `.cursor/rules/brandbook-skill.mdc`:

```markdown
---
description: Brandbook generation prompt for IG brand books
globs: lib/ai/gemini.ts
---

# Brandbook generation

When editing generateBrandbook or the brandbook prompt, use this structure:

[paste content from prompts/brandbook.md]
```

3. **Reference in chat**: Use `@brandbook-skill` or `@prompts/brandbook.md` when asking Cursor to modify or extend the brandbook logic.
4. **Sync back**: After editing the markdown, update the corresponding strings in `lib/ai/gemini.ts` or `lib/ai/build-image-prompt.ts`.

## Editing workflow

1. Edit the `.md` file in `prompts/`
2. Test changes by copying into the code
3. Optionally automate sync with a script or manual copy-paste
