import { SocialQueue } from "@/components/admin/SocialQueue";
import { listSocialPosts } from "@/actions/social";

export const dynamic = "force-dynamic";

export default async function AdminSocialPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const current = tab === "history" ? "history" : "upcoming";
  const posts = await listSocialPosts(current);
  return <SocialQueue posts={posts} tab={current} />;
}
