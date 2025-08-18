declare namespace chrome {
  export namespace storage {
    export interface StorageArea {
      get(keys: string[]): Promise<{ [key: string]: any }>;
      set(items: { [key: string]: any }): Promise<void>;
    }
    export const local: StorageArea;
  }
  export namespace runtime {
    export interface Port {
      postMessage: (message: any) => void;
      onMessage: {
        addListener: (callback: (message: any) => void) => void;
      };
      disconnect: () => void;
    }
    export const lastError: {
      message: string;
    } | undefined;
    export function connect(connectInfo?: { name?: string }): Port;
    export function sendMessage(
      message: any,
      callback?: (response: any) => void
    ): void;
    export const onMessage: {
      addListener: (
        callback: (
          message: any,
          sender: any,
          sendResponse: (response?: any) => void
        ) => void
      ) => void;
    };
  }
}
