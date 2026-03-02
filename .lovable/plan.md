

## Problem

The `AdminTracking` component fetches the `tracking_config` row with `maybeSingle()`. If no row exists in the database, `config` stays `null` and the component either shows "Laden..." indefinitely or, if a row exists but the `update` only does an `UPDATE` (not `UPSERT`), changes never persist.

The root cause is that no initial row is being created in `tracking_config`. The component needs to auto-create a default row if none exists.

## Plan

### 1. Fix `fetchConfig` in `AdminTracking.tsx`
- After `maybeSingle()` returns `null`, insert a default row into `tracking_config` and use that as the initial config.
- This ensures the toggles and fields are rendered and editable immediately.

### 2. Code change (single file: `src/components/AdminTracking.tsx`)
In `fetchConfig`, after the select query, if `data` is null:
```typescript
const fetchConfig = async () => {
  setLoading(true);
  let { data } = await supabase.from("tracking_config").select("*").limit(1).maybeSingle();
  if (!data) {
    const { data: inserted } = await supabase
      .from("tracking_config")
      .insert({})
      .select()
      .single();
    data = inserted;
  }
  if (data) setConfig(data as any);
  setLoading(false);
};
```

This single change ensures a config row always exists, making the toggles functional.

