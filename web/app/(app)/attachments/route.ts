import { coreFetch } from "@/lib/api";

// Uploads a note's image or PDF through core, which checks it and stores it in the user's folder.
// Answers core's { name } or its error status (413 too big, 415 not an image or PDF).
export async function POST(request: Request) {
  const res = await coreFetch("/attachments/", { method: "POST", body: await request.formData() });
  return new Response(res.body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
