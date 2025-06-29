# Supabase Authentication in React Native Expo

This document explains how the Supabase authentication is implemented in this React Native Expo app, including how we handle the "window is not defined" error that can occur during server-side rendering.

## Problem

When using Supabase authentication with React Native Expo, you might encounter the following error:

```
ReferenceError: window is not defined
    at getValue (node_modules/@react-native-async-storage/async-storage/lib/commonjs/AsyncStorage.js)
```

This happens because:
1. Expo's web platform tries to pre-render the app on the server
2. During this server-side rendering, there is no `window` object available
3. AsyncStorage (used by Supabase for session management) tries to access the `window` object

## Solution

We've implemented a solution that:

1. Creates a custom storage adapter that safely checks for the existence of the `window` object
2. Provides platform detection utilities to handle different environments
3. Skips authentication setup during server-side rendering
4. Adds proper error handling for authentication operations

## Key Files

- `lib/platformUtils.ts`: Utilities for detecting browser vs. server environments
- `lib/storageAdapter.ts`: Custom storage adapter for Supabase that handles different environments
- `lib/supabase.ts`: Supabase client configuration using the safe storage adapter
- `app/(tabs)/_layout.tsx`: Main layout component with authentication state management

## How It Works

1. **Platform Detection**: The `platformUtils.ts` file provides utilities to detect if code is running in a browser or server environment.

2. **Safe Storage Adapter**: The `storageAdapter.ts` file creates a custom storage adapter that:
   - Checks if the code is running in a browser environment before using AsyncStorage
   - Returns null or does nothing when in a server environment
   - Provides proper error handling

3. **Supabase Client**: The `supabase.ts` file initializes the Supabase client with:
   - The custom storage adapter
   - Proper session management configuration

4. **Authentication Flow**: The `_layout.tsx` file:
   - Skips authentication setup during server-side rendering
   - Handles authentication state changes
   - Provides proper error handling for authentication operations

## Usage

The authentication flow is handled automatically. The app will:
1. Check for an existing session
2. Show the Auth component if no session exists
3. Show the main app content if a session exists

## Troubleshooting

If you encounter authentication issues:

1. Check the console for error messages
2. Ensure the Supabase URL and anonymous key are correct
3. Verify that the custom storage adapter is being used correctly
4. Make sure the platform detection is working as expected

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
