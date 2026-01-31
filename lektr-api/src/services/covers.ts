import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const COVERS_DIR = process.env.COVERS_DIR || "./data/covers";

export async function downloadCover(
  imageUrl: string,
  bookId: string
): Promise<string | null> {
  try {
    if (!existsSync(COVERS_DIR)) {
      await mkdir(COVERS_DIR, { recursive: true });
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to download cover: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const extension = contentType.includes("png") ? "png" : 
                      contentType.includes("webp") ? "webp" : "jpg";

    const filename = `${bookId}.${extension}`;
    const filepath = join(COVERS_DIR, filename);

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(filepath, buffer);

    console.log(`📸 Cover saved: ${filepath}`);
    return `/api/v1/covers/${filename}`;
  } catch (error) {
    console.error("Failed to download cover:", error);
    return null;
  }
}

export function getCoverPath(filename: string): string {
  return join(COVERS_DIR, filename);
}

export function coverExists(filename: string): boolean {
  return existsSync(join(COVERS_DIR, filename));
}
