import { ManualPostWizard } from "@/components/admin/ManualPostWizard";
import { getManualPost, listManualProducts } from "@/actions/social-manual";
import { MUSIC_TRACKS } from "@/lib/social-tracks";

export const dynamic = "force-dynamic";

export default async function NewManualPostPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const [products, post] = await Promise.all([listManualProducts(), id ? getManualPost(id) : Promise.resolve(null)]);
  return <ManualPostWizard products={products} tracks={MUSIC_TRACKS} initial={post?.status === "composing" ? post : null} />;
}
