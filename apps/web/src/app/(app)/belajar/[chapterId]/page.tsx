import { ChapterLesson } from "@/features/learning/ui/ChapterLesson";

export default function Page({ params }: { params: { chapterId: string } }) {
  return <ChapterLesson chapterId={params.chapterId} />;
}
