# Toast Notifications System

This document describes the toast notification system in OpenAlgo's React frontend, including guidelines for developers adding new features.

## Overview

OpenAlgo uses [Sonner](https://sonner.emilkowal.ski/) (v2.0.7) as the underlying toast library, wrapped with a custom utility that provides category-based filtering. This allows users to control which types of notifications they see via the **Profile > Alerts** settings.

## Architecture

<figure><img src="../../.gitbook/assets/diagram-toast-notification-flow.png" alt="Toast flow: feature code or useSocket calls shouldShowToast against the persisted alertStore, then sonner renders via the Toaster or the toast is suppressed"><figcaption></figcaption></figure>

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/utils/toast.ts` | Toast wrapper utility with category filtering |
| `frontend/src/stores/alertStore.ts` | Zustand store for user preferences |
| `frontend/src/components/ui/sonner.tsx` | Sonner Toaster component |
| `frontend/src/app/providers.tsx` | Toaster configuration (position, duration) |
| `frontend/src/pages/Profile.tsx` | Alerts settings UI (Profile > Alerts tab) |
| `frontend/src/hooks/useSocket.ts` | Socket.IO toast events (real-time) |

## Available Categories

The following categories are available for toast notifications:

| Category | Description | Use Cases |
|----------|-------------|-----------|
| `orders` | Order-related notifications | Order placed, cancelled, modified, rejected |
| `analyzer` | Sandbox/analyzer mode operations | Mode toggle, sandbox trading actions |
| `system` | System-wide notifications | Login, logout, password change, theme |
| `actionCenter` | Semi-auto order approval | Pending order alerts |
| `historify` | Historical data operations | Download jobs, schedules, uploads |
| `strategy` | TradingView strategy management | Strategy CRUD, symbol mapping |
| `positions` | Position operations | Close position, PnL tracker |
| `chartink` | Chartink strategy operations | Chartink strategy CRUD |
| `pythonStrategy` | Python strategy operations | Upload, start, stop, schedule |
| `telegram` | Telegram bot operations | Bot config, user management |
| `whatsapp` | WhatsApp bot operations | Bot config, user management |
| `flow` | Workflow automation | Workflow CRUD, execution |
| `admin` | Admin panel operations | Market timings, holidays, freeze qty |
| `monitoring` | Monitoring dashboards | Health, latency, security, traffic |
| `clipboard` | Copy to clipboard feedback | Any copy operation |

All fifteen categories default to `true` in `DEFAULT_STATE.categories`. Note that `whatsapp` currently has no toggle in the Profile > Alerts UI: it exists in the store and filters toasts, but users cannot switch it off from there.

## Developer Guidelines

### 1. Always Use the showToast Utility

**DO:**
```typescript
import { showToast } from '@/utils/toast'

showToast.success('Order placed successfully', 'orders')
showToast.error('Failed to load data', 'strategy')
```

**DON'T:**
```typescript
// Never import toast directly from sonner in feature files
import { toast } from 'sonner'  // BAD
toast.success('Order placed')    // BAD - no category control
```

### 2. Always Include a Category

Every toast call should include a category as the second parameter:

```typescript
// Syntax. `category` is optional in the type signature but should be supplied.
showToast.success(message: string, category?: keyof AlertCategories, options?: ToastOptions)
showToast.error(message: string, category?: keyof AlertCategories, options?: ToastOptions)
showToast.warning(message: string, category?: keyof AlertCategories, options?: ToastOptions)
showToast.info(message: string, category?: keyof AlertCategories, options?: ToastOptions)

// Also exported from @/utils/toast
showToast.dynamic(type: ToastType, message: string, category?, options?)
showToast.show(type: ToastType, message: string, category?, options?)
showToast.dismissAll()
```

`ToastOptions` carries only `duration` and `description`.

**Examples:**
```typescript
// Order operations
showToast.success('Order placed', 'orders')
showToast.error('Order rejected', 'orders')

// Strategy operations
showToast.success('Strategy created', 'strategy')
showToast.error('Failed to load strategy', 'strategy')

// Copy to clipboard
showToast.success('Copied to clipboard', 'clipboard')
showToast.error('Failed to copy', 'clipboard')

// Admin operations
showToast.success('Settings saved', 'admin')
showToast.error('Failed to update', 'admin')
```

### 3. Choose the Right Category

When adding a new feature, determine which category best fits:

- **New trading feature** → `orders` or `positions`
- **New strategy type** → `strategy`, `chartink`, or `pythonStrategy`
- **New admin feature** → `admin`
- **New monitoring feature** → `monitoring`
- **Copy operations** → `clipboard`
- **Authentication/system** → `system`

### 4. When to Show Toasts

**DO show toasts for:**
- Successful operations (create, update, delete)
- Failed operations with user-actionable errors
- Important state changes
- Copy to clipboard confirmation

**DON'T show toasts for:**
- Loading states (use spinners instead)
- Every API response
- Validation errors in forms (show inline)
- Background refresh operations

### 5. Toast Options

You can pass additional options as the third parameter:

```typescript
showToast.warning('New order pending', 'actionCenter', {
  duration: 5000,  // 5 seconds (default is from user settings)
  description: 'Click to view details'
})
```

### 6. Validation Errors

For form validation errors that should not be filtered by category, omit the category:

```typescript
// No category means no per-category filtering, but the master
// "Enable Toasts" toggle still applies.
showToast.error('Please fill all required fields')
showToast.error('Invalid email format')
```

For messages that must show even when the master toggle is off, import the raw toast:

```typescript
import { toast } from '@/utils/toast'  // Re-exported raw sonner toast
toast.error('Critical system error')   // Bypasses the store entirely
```

## Adding a New Category

If you're adding a major new feature that doesn't fit existing categories:

### 1. Update alertStore.ts

```typescript
// frontend/src/stores/alertStore.ts

export interface AlertCategories {
  // ... existing categories
  newFeature: boolean  // Add your new category
}

const DEFAULT_STATE = {
  // ... master controls and display settings
  categories: {
    // ... existing defaults
    newFeature: true,  // Default to enabled
  },
}
```

### 2. Update Profile.tsx Alerts Tab

`Profile.tsx` groups the toggles into four arrays: `ALERT_CATEGORIES_REALTIME`, `ALERT_CATEGORIES_TRADING`, `ALERT_CATEGORIES_DATA` and `ALERT_CATEGORIES_ADMIN`. Add the entry to whichever one fits:

```typescript
// frontend/src/pages/Profile.tsx

{
  key: 'newFeature',
  label: 'New Feature',
  description: 'Notifications for new feature operations',
},
```

### 3. Use the New Category

```typescript
showToast.success('New feature action completed', 'newFeature')
```

## Socket.IO Real-Time Toasts

For real-time events via Socket.IO, the pattern is slightly different:

```typescript
// frontend/src/hooks/useSocket.ts

import { toast } from 'sonner'
import { useAlertStore, type AlertCategories } from '@/stores/alertStore'

// Helper function for socket events
const showCategoryToast = (
  type: 'success' | 'error' | 'warning' | 'info',
  message: string,
  category?: keyof AlertCategories
) => {
  const { shouldShowToast } = useAlertStore.getState()
  if (shouldShowToast(category)) {
    toast[type](message)
  }
}

// Usage in socket event handlers
socket.on('order_event', (data) => {
  showCategoryToast('success', `Order ${data.action} ${data.symbol}`, 'orders')
})
```

The socket events currently handled in `useSocket.ts` are `force_logout`, `password_change`, `master_contract_download`, `cancel_order_event`, `modify_order_event`, `close_position_event`, `order_event`, `active_sessions_update` and `analyzer_update`.

Alert sounds go through a separate helper that requires `shouldPlaySound()` and, when a category is given, `shouldShowToast(category)`. Playback is throttled by `AUDIO_THROTTLE_MS = 1000`.

## User Settings

Users control toast behavior via **Profile > Alerts**:

Settings live in the `alertStore` Zustand store and are persisted to `localStorage` under the key `openalgo-alerts`.

### Master Controls
- **Enable Toasts** (`toastsEnabled`, default `true`): Master toggle for all toast notifications
- **Enable Sounds** (`soundEnabled`, default `true`): Toggle alert sounds. `shouldPlaySound()` requires both toggles to be on

### Category Toggles
Users can enable/disable each category independently. `whatsapp` is the one category not currently exposed in this tab.

### Display Settings
- **Position** (`position`, default `top-right`): one of `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`
- **Max Visible** (`maxVisibleToasts`, default `3`): 1 to 10 toasts at once
- **Duration** (`duration`, default `3000` ms): 1 to 15 seconds

### Actions
- **Test Toast**: Preview current settings
- **Clear All Toasts**: Dismiss all visible toasts
- **Reset to Defaults**: Restore default settings via `alertStore.resetToDefaults()`

## Testing

When testing toast functionality:

1. **Test with all categories enabled** (default)
2. **Test with specific category disabled** - verify toast is suppressed
3. **Test with master toggle disabled** - verify all toasts suppressed
4. **Test position/duration settings** - verify display changes

## Common Patterns

### CRUD Operations

```typescript
// Create
const handleCreate = async () => {
  try {
    const response = await api.create(data)
    if (response.status === 'success') {
      showToast.success('Item created successfully', 'strategy')
    } else {
      showToast.error(response.message || 'Failed to create item', 'strategy')
    }
  } catch (error) {
    showToast.error('Failed to create item', 'strategy')
  }
}

// Delete
const handleDelete = async () => {
  try {
    const response = await api.delete(id)
    if (response.status === 'success') {
      showToast.success('Item deleted', 'strategy')
    } else {
      showToast.error(response.message || 'Failed to delete', 'strategy')
    }
  } catch (error) {
    showToast.error('Failed to delete item', 'strategy')
  }
}
```

### Copy to Clipboard

```typescript
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast.success('Copied to clipboard', 'clipboard')
  } catch {
    showToast.error('Failed to copy', 'clipboard')
  }
}
```

### Toggle Operations

```typescript
const handleToggle = async () => {
  try {
    const response = await api.toggle(id)
    if (response.status === 'success') {
      showToast.success(
        response.data?.is_active ? 'Activated' : 'Deactivated',
        'strategy'
      )
    } else {
      showToast.error(response.message || 'Failed to toggle', 'strategy')
    }
  } catch {
    showToast.error('Failed to toggle', 'strategy')
  }
}
```

## Migration Guide

If you find code using raw sonner imports:

```typescript
// Before
import { toast } from 'sonner'
toast.success('Done')

// After
import { showToast } from '@/utils/toast'
showToast.success('Done', 'appropriateCategory')
```

## Summary

1. **Always use `showToast`** from `@/utils/toast`
2. **Always include a category** as the second parameter
3. **Choose the appropriate category** based on feature type
4. **Test with user settings** to ensure proper filtering
5. **Add new categories** only for major new feature areas
