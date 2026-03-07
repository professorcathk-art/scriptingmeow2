# Supabase Setup for Design Playground & Post Refinement

This document describes what you need to do in Supabase to enable the new features.

## 1. Run the migration

Apply the migration `013_design_playground_and_post_refinement.sql`:

```bash
# If using Supabase CLI locally
supabase db push

# Or run the SQL manually in Supabase Dashboard → SQL Editor
```

Or copy the contents of `supabase/migrations/013_design_playground_and_post_refinement.sql` and run it in the SQL Editor.

## 2. Tables created

| Table | Purpose |
|-------|---------|
| `design_playground_threads` | Thread/tile-based design sessions |
| `design_playground_items` | Each generate/refine step in a thread |
| `library_folders` | User folders (e.g. "My design") |
| `library_items` | Design playground outputs, post refinements |
| `post_refinement_history` | Version history for post refinements |

## 3. Storage bucket

The `post-images` bucket (or equivalent) must exist and allow uploads. Design playground images use path `design-playground/{userId}/{id}.png`. Post refinement images use `{userId}/{postId}-refine-{n}.png`.

No new buckets are required. Ensure your existing `post-images` bucket has appropriate policies for the service role.

## 4. RLS policies

All tables have Row Level Security (RLS) enabled. Policies ensure:

- Users can only access their own `design_playground_threads` and `design_playground_items`
- Users can only access their own `library_folders` and `library_items`
- Users can only access `post_refinement_history` for posts they own (via brand_spaces)

## 5. Optional: Create "My design" folder on first use

The app auto-creates the "My design" folder when the user first saves a design. No manual setup needed.

## 6. Verification

After running the migration:

1. Check that all tables exist in the Table Editor
2. Verify RLS is enabled on each table
3. Test Design Playground: create a design, verify it appears in Library → My design
4. Test Post Refinement: open a post in Review, add a refinement comment, verify version history appears
