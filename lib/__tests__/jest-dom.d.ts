import type JestDom from "@testing-library/jest-dom/matchers";
import type { expect } from "bun:test";

declare module "bun:test" {
  interface Matchers<T>
    extends JestDom.TestingLibraryMatchers<
        typeof expect.stringContaining,
        T
      > {}
}
