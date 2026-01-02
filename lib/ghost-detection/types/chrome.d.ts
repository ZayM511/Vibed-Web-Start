/**
 * Chrome Extension API type declarations
 * Minimal types needed for ghost detection storage
 */

declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(
        keys: string | string[] | Record<string, unknown> | null
      ): Promise<Record<string, unknown>>;
      get(
        keys: string | string[] | Record<string, unknown> | null,
        callback: (items: Record<string, unknown>) => void
      ): void;
      set(items: Record<string, unknown>): Promise<void>;
      set(items: Record<string, unknown>, callback?: () => void): void;
      remove(keys: string | string[]): Promise<void>;
      remove(keys: string | string[], callback?: () => void): void;
      clear(): Promise<void>;
      clear(callback?: () => void): void;
    }

    const local: StorageArea;
    const sync: StorageArea;
    const session: StorageArea;
  }
}
