import { redirect } from "next/navigation";

export default function AdminLegacyChapterEditorPage({ params }: { params: { chapterId: string } }) {
  redirect(`/admin/materi/bab/${params.chapterId}`);
}
