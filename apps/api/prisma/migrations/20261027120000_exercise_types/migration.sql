-- AlterEnum
ALTER TYPE "QuizType" ADD VALUE 'susun_huruf';
ALTER TYPE "QuizType" ADD VALUE 'menulis';
ALTER TYPE "QuizType" ADD VALUE 'berbicara';

-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN     "hint" VARCHAR(255);
