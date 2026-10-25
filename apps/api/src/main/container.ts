/**
 * Composition root: SATU-SATUNYA tempat yang tahu implementasi konkret.
 * Mau ganti email sender, penyedia AI, atau database? Cukup ubah file ini.
 */
import type { Env } from "../shared/config/env";
import { systemClock } from "../shared/domain/types";
import type { Db } from "../shared/infrastructure/prisma";

// Auth
import { PrismaUserRepository } from "../modules/auth/infrastructure/PrismaUserRepository";
import { PrismaOAuthAccountRepository } from "../modules/auth/infrastructure/PrismaOAuthAccountRepository";
import { PrismaSessionRepository } from "../modules/auth/infrastructure/PrismaSessionRepository";
import { PrismaOneTimeTokenRepository } from "../modules/auth/infrastructure/PrismaOneTimeTokenRepository";
import { BcryptPasswordHasher, CryptoTokenGenerator, JwtAccessTokenService } from "../modules/auth/infrastructure/security";
import { ConsoleEmailSender, NotConfiguredOAuthVerifier } from "../modules/auth/infrastructure/adapters";
import { SessionIssuer } from "../modules/auth/application/SessionIssuer";
import { SendEmailVerification } from "../modules/auth/application/SendEmailVerification";
import { RegisterWithEmail } from "../modules/auth/application/RegisterWithEmail";
import { LoginWithEmail } from "../modules/auth/application/LoginWithEmail";
import { LoginWithOAuth } from "../modules/auth/application/LoginWithOAuth";
import { StartGuestSession } from "../modules/auth/application/StartGuestSession";
import { RefreshSession } from "../modules/auth/application/RefreshSession";
import { Logout } from "../modules/auth/application/Logout";
import { VerifyEmail } from "../modules/auth/application/VerifyEmail";
import { RequestPasswordReset, ResetPassword } from "../modules/auth/application/PasswordReset";
import { GetCurrentUser } from "../modules/auth/application/GetCurrentUser";
import { CompleteOnboarding } from "../modules/auth/application/CompleteOnboarding";

// Learning
import { PrismaLearningRepository } from "../modules/learning/infrastructure/PrismaLearningRepository";
import { GetChapter, GetLevelProgress, GetNextChapter, ListChapters, ListLevels, SubmitQuiz } from "../modules/learning/application/LearningUseCases";

// SRS
import { PrismaSrsRepository } from "../modules/srs/infrastructure/PrismaSrsRepository";
import { GetDueCards, ReviewCard } from "../modules/srs/application/SrsUseCases";

// Conversation
import { PrismaConversationRepository } from "../modules/conversation/infrastructure/PrismaConversationRepository";
import { AnthropicChatProvider } from "../modules/conversation/infrastructure/AnthropicChatProvider";
import { MockChatProvider } from "../modules/conversation/infrastructure/MockChatProvider";
import { EndConversation, SendMessage, StartConversation } from "../modules/conversation/application/ConversationUseCases";

// Ask (Tanya Sensei)
import { AnthropicAskProvider } from "../modules/ask/infrastructure/AnthropicAskProvider";
import { GeminiAskProvider } from "../modules/ask/infrastructure/GeminiAskProvider";
import { GroqAskProvider } from "../modules/ask/infrastructure/GroqAskProvider";
import { MockAskProvider } from "../modules/ask/infrastructure/MockAskProvider";
import { GroqTranscriber } from "../modules/ask/infrastructure/GroqTranscriber";
import { GeminiTts } from "../shared/infrastructure/geminiTts";
import { AskQuestion } from "../modules/ask/application/AskUseCase";

// Exam
import { PrismaExamRepository } from "../modules/exam/infrastructure/PrismaExamRepository";
import { GetPlacementQuestions, SubmitPlacementExam } from "../modules/exam/application/ExamUseCases";

// Users (admin)
import { PrismaAuditLogger, PrismaUserAdminRepository } from "../modules/users/infrastructure/PrismaUserAdmin";
import { ChangeUserRole, SearchUsers, SuspendUser } from "../modules/users/application/UserAdminUseCases";

export function buildContainer(env: Env, db: Db) {
  const clock = systemClock;

  // ── Auth ──
  const users = new PrismaUserRepository(db);
  const sessions = new PrismaSessionRepository(db);
  const oneTimeTokens = new PrismaOneTimeTokenRepository(db);
  const oauthAccounts = new PrismaOAuthAccountRepository(db);
  const hasher = new BcryptPasswordHasher();
  const tokens = new CryptoTokenGenerator();
  const accessTokens = new JwtAccessTokenService(env.JWT_ACCESS_SECRET, env.ACCESS_TOKEN_TTL_MINUTES);
  const email = new ConsoleEmailSender();
  const refreshTtlDays = env.REFRESH_TOKEN_TTL_DAYS;

  const sessionIssuer = new SessionIssuer({ sessions, tokens, accessTokens, clock, refreshTtlDays });
  const sendVerification = new SendEmailVerification({ users, oneTimeTokens, tokens, email, clock, webOrigin: env.WEB_ORIGIN });

  const auth = {
    register: new RegisterWithEmail({ users, hasher, sessions: sessionIssuer, sendVerification, clock }),
    login: new LoginWithEmail({ users, hasher, sessions: sessionIssuer, clock }),
    loginWithOAuth: new LoginWithOAuth({ users, oauthAccounts, verifier: new NotConfiguredOAuthVerifier(), sessions: sessionIssuer, clock }),
    startGuest: new StartGuestSession({ users, sessions: sessionIssuer }),
    refresh: new RefreshSession({ users, sessions, tokens, accessTokens, clock, refreshTtlDays }),
    logout: new Logout({ sessions, tokens, clock }),
    verifyEmail: new VerifyEmail({ users, oneTimeTokens, tokens, clock }),
    sendVerification,
    requestPasswordReset: new RequestPasswordReset({ users, oneTimeTokens, tokens, email, clock, webOrigin: env.WEB_ORIGIN }),
    resetPassword: new ResetPassword({ users, oneTimeTokens, sessions, tokens, hasher, clock }),
    getCurrentUser: new GetCurrentUser({ users }),
    completeOnboarding: new CompleteOnboarding({ users }),
  };

  // ── Learning ──
  const learningRepo = new PrismaLearningRepository(db);
  const learning = {
    listLevels: new ListLevels({ repo: learningRepo }),
    listChapters: new ListChapters({ repo: learningRepo }),
    getChapter: new GetChapter({ repo: learningRepo }),
    getNextChapter: new GetNextChapter({ repo: learningRepo, users }),
    submitQuiz: new SubmitQuiz({ repo: learningRepo, clock }),
    getLevelProgress: new GetLevelProgress({ repo: learningRepo }),
  };

  // ── SRS ──
  const srsRepo = new PrismaSrsRepository(db);
  const srs = { getDue: new GetDueCards({ repo: srsRepo, clock }), review: new ReviewCard({ repo: srsRepo, clock }) };

  // ── AI maskot (ngobrol) ──
  const ai = env.ANTHROPIC_API_KEY ? new AnthropicChatProvider(env.ANTHROPIC_API_KEY, env.AI_MODEL) : new MockChatProvider();

  // ── Tanya Sensei (Q&A) — prioritas: Groq → Gemini → Anthropic → Mock ──
  const askProvider = env.GROQ_API_KEY
    ? new GroqAskProvider(env.GROQ_API_KEY)
    : env.GEMINI_API_KEY
      ? new GeminiAskProvider(env.GEMINI_API_KEY)
      : env.ANTHROPIC_API_KEY
        ? new AnthropicAskProvider(env.ANTHROPIC_API_KEY, env.AI_MODEL)
        : new MockAskProvider();
  const askUc = { ask: new AskQuestion({ ask: askProvider }) };
  const transcriber = env.GROQ_API_KEY ? new GroqTranscriber(env.GROQ_API_KEY) : null;
  const speaker = env.GEMINI_API_KEY ? new GeminiTts(env.GEMINI_API_KEY) : null;
  const convDeps = { repo: new PrismaConversationRepository(db), ai, clock, freeDailyLimit: env.FREE_DAILY_AI_SESSIONS };
  const conversation = {
    start: new StartConversation(convDeps),
    send: new SendMessage(convDeps),
    end: new EndConversation(convDeps),
  };

  // ── Exam ──
  const examRepo = new PrismaExamRepository(db);
  const exam = {
    getPlacementQuestions: new GetPlacementQuestions({ repo: examRepo }),
    submitPlacementExam: new SubmitPlacementExam({ repo: examRepo }),
  };

  // ── Admin: pengguna ──
  const adminRepo = new PrismaUserAdminRepository(db);
  const audit = new PrismaAuditLogger(db);
  const adminUsers = {
    search: new SearchUsers({ repo: adminRepo }),
    changeRole: new ChangeUserRole({ repo: adminRepo, audit }),
    suspend: new SuspendUser({ repo: adminRepo, audit, clock }),
  };

  return { accessTokens, auth, learning, srs, conversation, exam, adminUsers, askUc, transcriber, speaker, aiMode: env.ANTHROPIC_API_KEY ? "anthropic" : "mock" };
}

export type Container = ReturnType<typeof buildContainer>;
