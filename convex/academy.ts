import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireOwner } from "./lib/auth";
import {
  copyUrl,
  createFolder,
  createGoogleDoc,
  driveEnvFromProcess,
  findChildFolder,
} from "./lib/googleDrive";
import { documentHtml } from "./lib/worksheet";

/**
 * EcomAIOS Academy: one Drive folder per module, one native Google Doc per
 * training, all under one root. Owner-only, like every Drive write.
 *
 * Folders are idempotent (found by exact name before being created), so a
 * re-run after a partial failure picks up where it stopped. Docs are always
 * created — versioning a Doc a human may have edited is the caller's job
 * (academy PRD FR-9), never this action's.
 *
 * The root lands under `parentId` when given, else under the worksheets folder
 * (`SKOOL_WORKSHEETS_FOLDER_ID`). Setup and sharing: `docs/skool-worksheets.md`;
 * sharing the root is a one-time human step, this never touches permissions.
 */
export const createModuleTree = action({
  args: {
    rootName: v.string(),
    parentId: v.optional(v.string()),
    modules: v.array(
      v.object({
        name: v.string(),
        docs: v.array(v.object({ title: v.string(), markdown: v.string() })),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const rootName = args.rootName.trim();
    if (!rootName) throw new ConvexError("Root folder name is required");
    const env = driveEnvFromProcess();
    const parentId = args.parentId ?? env.folderId;

    const root =
      (await findChildFolder({ name: rootName, parentId }, env)) ??
      (await createFolder({ name: rootName, parentId }, env));

    const modules: {
      name: string;
      folder: { id: string; url: string };
      docs: { title: string; url: string; copyUrl: string }[];
    }[] = [];

    for (const m of args.modules) {
      const name = m.name.trim();
      if (!name) throw new ConvexError("Every module needs a name");
      const folder =
        (await findChildFolder({ name, parentId: root.id }, env)) ??
        (await createFolder({ name, parentId: root.id }, env));
      const docs: { title: string; url: string; copyUrl: string }[] = [];
      for (const d of m.docs) {
        const title = d.title.trim();
        if (!title) throw new ConvexError(`A doc in "${name}" has no title`);
        if (!d.markdown.trim()) throw new ConvexError(`"${title}" has no body`);
        const doc = await createGoogleDoc(
          { title, html: documentHtml(d.markdown), folderId: folder.id },
          env
        );
        docs.push({ title, url: doc.url, copyUrl: copyUrl(doc.url) });
      }
      modules.push({ name, folder, docs });
    }
    return { root, modules };
  },
});
