/**
 * Covers API Integration Tests
 *
 * Tests HTTP behavior of cover image serving endpoint including:
 * - Public access (no auth required)
 * - Content-Type detection by file extension
 * - Cache-Control headers
 * - 404 for missing covers
 * - 500 for file read failures
 * - Security: path traversal prevention
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const mockCoverExists = vi.fn<(filename: string) => boolean>();
const mockGetCoverPath = vi.fn<(filename: string) => string>();
const mockReadFile = vi.fn<(path: string) => Promise<Buffer>>();

// Mock covers service
vi.mock("../../src/services/covers", () => ({
  coverExists: (...args: any[]) => mockCoverExists(...args),
  getCoverPath: (...args: any[]) => mockGetCoverPath(...args),
}));

// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: (...args: any[]) => mockReadFile(...args),
}));

describe("Covers API", () => {
  let app: Hono;

  const FAKE_IMAGE_DATA = Buffer.from("fake-image-binary-data");

  beforeEach(async () => {
    vi.clearAllMocks();

    mockCoverExists.mockReturnValue(false);
    mockGetCoverPath.mockImplementation(
      (filename: string) => `/data/covers/${filename}`
    );
    mockReadFile.mockResolvedValue(FAKE_IMAGE_DATA);

    const { coversOpenAPI } = await import(
      "../../src/openapi/covers.handlers"
    );
    app = new Hono();
    app.route("/covers", coversOpenAPI);
  });

  // ============================================
  // PUBLIC ACCESS TESTS
  // ============================================
  describe("Public Access", () => {
    test("GET /covers/:filename should not require authentication", async () => {
      mockCoverExists.mockReturnValue(true);

      const res = await app.request("/covers/book-123.jpg");

      // Should not return 401 - covers are public
      expect(res.status).not.toBe(401);
      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // SUCCESSFUL SERVING TESTS
  // ============================================
  describe("GET /covers/:filename", () => {
    test("should serve JPEG cover with correct Content-Type", async () => {
      mockCoverExists.mockReturnValue(true);

      const res = await app.request("/covers/book-123.jpg");

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    });

    test("should serve PNG cover with correct Content-Type", async () => {
      mockCoverExists.mockReturnValue(true);

      const res = await app.request("/covers/book-123.png");

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
    });

    test("should serve WebP cover with correct Content-Type", async () => {
      mockCoverExists.mockReturnValue(true);

      const res = await app.request("/covers/book-123.webp");

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/webp");
    });

    test("should default to image/jpeg for unknown extensions", async () => {
      mockCoverExists.mockReturnValue(true);

      const res = await app.request("/covers/book-123.bmp");

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    });

    test("should set Cache-Control header for 1 year", async () => {
      mockCoverExists.mockReturnValue(true);

      const res = await app.request("/covers/book-123.jpg");

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe(
        "public, max-age=31536000"
      );
    });

    test("should return image binary data in response body", async () => {
      mockCoverExists.mockReturnValue(true);

      const res = await app.request("/covers/book-123.jpg");

      expect(res.status).toBe(200);
      const body = Buffer.from(await res.arrayBuffer());
      expect(body).toEqual(FAKE_IMAGE_DATA);
    });

    test("should call getCoverPath with the filename", async () => {
      mockCoverExists.mockReturnValue(true);

      await app.request("/covers/my-book.jpg");

      expect(mockGetCoverPath).toHaveBeenCalledWith("my-book.jpg");
    });

    test("should call readFile with the resolved path", async () => {
      mockCoverExists.mockReturnValue(true);
      mockGetCoverPath.mockReturnValue("/data/covers/my-book.jpg");

      await app.request("/covers/my-book.jpg");

      expect(mockReadFile).toHaveBeenCalledWith("/data/covers/my-book.jpg");
    });
  });

  // ============================================
  // NOT FOUND TESTS
  // ============================================
  describe("404 - Cover Not Found", () => {
    test("should return 404 when cover does not exist", async () => {
      mockCoverExists.mockReturnValue(false);

      const res = await app.request("/covers/nonexistent.jpg");

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    test("should not call readFile when cover does not exist", async () => {
      mockCoverExists.mockReturnValue(false);

      await app.request("/covers/nonexistent.jpg");

      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe("500 - File Read Failure", () => {
    test("should return 500 when readFile throws", async () => {
      mockCoverExists.mockReturnValue(true);
      mockReadFile.mockRejectedValue(new Error("EACCES: permission denied"));
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await app.request("/covers/book-123.jpg");

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test("should return 500 when readFile throws unexpected error", async () => {
      mockCoverExists.mockReturnValue(true);
      mockReadFile.mockRejectedValue(new Error("ENOENT: file disappeared"));
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await app.request("/covers/book-123.jpg");

      expect(res.status).toBe(500);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================
  describe("Security", () => {
    test("path traversal with ../../../etc/passwd should return 404", async () => {
      // coverExists should return false for traversal attempts
      mockCoverExists.mockReturnValue(false);

      const res = await app.request(
        "/covers/..%2F..%2F..%2Fetc%2Fpasswd"
      );

      expect(res.status).toBe(404);
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    test("path traversal with encoded slashes should return 404", async () => {
      mockCoverExists.mockReturnValue(false);

      const res = await app.request(
        "/covers/..%2F..%2F..%2Fetc%2Fshadow"
      );

      expect(res.status).toBe(404);
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    test("path traversal with dot-dot-slash should return 404", async () => {
      mockCoverExists.mockReturnValue(false);

      const res = await app.request("/covers/../../../etc/passwd");

      // Should be 404 regardless of how the path resolves
      expect([404, 400]).toContain(res.status);
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    test("null byte injection should not serve files", async () => {
      mockCoverExists.mockReturnValue(false);

      const res = await app.request("/covers/book.jpg%00.sh");

      expect(res.status).toBe(404);
      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });
});
