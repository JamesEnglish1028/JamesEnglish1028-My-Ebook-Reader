# React Query Error Handling Guide

## Overview

MeBooks uses React Query for data fetching with a two-tier error handling strategy:

1. **Inline Error Handling** (default) - Most errors display in-place with retry options
2. **Error Boundaries** (opt-in) - Critical errors bubble up to ErrorBoundary components

## Default Behavior

By default, queries and mutations **do not throw errors to error boundaries**:

```typescript
// QueryClient configuration (App.tsx)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: false,  // Errors stay in query result
    },
    mutations: {
      throwOnError: false,  // Errors stay in mutation result
    },
  },
});
```

## Inline Error Handling (Preferred)

Most components should handle errors inline using the `ErrorDisplay` component:

```tsx
import { useBooks } from '../hooks';
import { Loading, ErrorDisplay } from '../components/shared';

function MyComponent() {
  const { data: books = [], isLoading, error, refetch } = useBooks();

  if (isLoading) {
    return <Loading variant="skeleton" />;
  }

  if (error) {
    return (
      <ErrorDisplay
        variant="page"
        title="Failed to Load Books"
        message={error?.message || 'Could not load books.'}
        onRetry={() => refetch()}
      />
    );
  }

  return <div>{/* Render books */}</div>;
}
```

### When to Use Inline Handling

- ✅ List views (library, catalogs)
- ✅ Detail views (book details)
- ✅ Forms and mutations
- ✅ Any recoverable error with retry option
- ✅ Network errors
- ✅ Validation errors

## Error Boundaries (Opt-In)

For critical errors that should crash the component tree, opt-in to error boundaries:

```tsx
// Individual query opt-in
const { data } = useQuery({
  queryKey: ['critical-data'],
  queryFn: fetchCriticalData,
  throwOnError: true,  // Throw to nearest error boundary
});

// Or use a functional check
const { data } = useQuery({
  queryKey: ['user-auth'],
  queryFn: fetchUserAuth,
  throwOnError: (error) => {
    // Only throw authentication errors
    return error.status === 401;
  },
});
```

### When to Use Error Boundaries

- ✅ Authentication failures
- ✅ Permission denied errors
- ✅ Corrupted database state
- ✅ Critical system failures
- ✅ Unrecoverable parsing errors

### Error Boundary Setup

The app is wrapped with `QueryErrorResetBoundary` which resets all queries when the error boundary resets:

```tsx
<QueryClientProvider client={queryClient}>
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary onReset={() => { reset(); window.location.reload(); }}>
        <App />
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
</QueryClientProvider>
```

## Error Types

### Network Errors

```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
} catch (error) {
  // Handle network errors inline
  return { error: error.message };
}
```

### Query Errors

```typescript
// Error object structure
{
  message: string;        // Human-readable error message
  status?: number;        // HTTP status code (if applicable)
  cause?: unknown;        // Original error
}
```

### Mutation Errors

```typescript
const { mutate, error, isPending } = useMutation({
  mutationFn: saveData,
  onError: (error) => {
    // Log error for debugging
    logger.error('Mutation failed:', error);
    // Error is also available in component
  },
});

// Display error in component
{error && <ErrorDisplay variant="inline" message={error.message} />}
```

## Best Practices

1. **Default to Inline Handling**
   - Most errors should be handled inline with retry options
   - Users prefer seeing errors in context rather than crash screens

2. **Use Loading States**
   - Show loading indicators during retries
   - Disable buttons during mutations with `isPending`

3. **Provide Retry Options**
   - Use `onRetry={() => refetch()}` for queries
   - Use `onRetry={() => mutate(variables)}` for mutations

4. **Log Errors**
   - Always log errors for debugging: `logger.error('Context:', error)`
   - Include relevant context (book id, url, etc.)

5. **User-Friendly Messages**
   - Transform technical errors into user-friendly messages
   - Provide actionable next steps

```typescript
// Bad
message: error.message  // "Failed to fetch"

// Good
message: error?.message || 'Could not load catalog. Please check your internet connection and try again.'
```

6. **Granular Error Handling**
   - Different error types need different handling
   - Don't use error boundaries as a catch-all

```typescript
if (error?.status === 401) {
  return <ErrorDisplay message="Please log in to continue" />;
}
if (error?.status === 404) {
  return <ErrorDisplay message="Book not found" />;
}
return <ErrorDisplay message="Something went wrong" onRetry={refetch} />;
```

## Testing Error States

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

it('displays error message on query failure', async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },  // Disable retries in tests
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MyComponent />
    </QueryClientProvider>
  );

  // Wait for error to appear
  expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
});
```

## Summary

| Scenario | Strategy | Component |
|----------|----------|-----------|
| Network errors | Inline | `<ErrorDisplay variant="page" />` |
| List empty states | Inline | `<EmptyState />` |
| Form validation | Inline | `<ErrorDisplay variant="inline" />` |
| Loading states | Inline | `<Loading variant="spinner" />` |
| Critical auth errors | Boundary | `throwOnError: true` |
| Database corruption | Boundary | `throwOnError: true` |

**Default**: Handle errors inline. Only use error boundaries for unrecoverable failures.
