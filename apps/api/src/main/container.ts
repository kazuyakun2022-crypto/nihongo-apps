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
import { ConsoleEmailSender, GoogleOAuthVerifier, NotConfiguredOAuthVerifier } from "../modules/auth/infrastructure/adapters";
import { ResendEmailSender } from "../modules/auth/infrastructure/ResendEmailSender";
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
import { UpdateAvatar } from "../modules/auth/application/UpdateAvatar";
import { UpdateProfile } from "../modules/auth/application/UpdateProfile";

// Learning
import { PrismaLearningRepository } from "../modules/learning/infrastructure/PrismaLearningRepository";
import { PrismaOnboardingGuard, loadOnboardingConfig } from "../modules/learning/infrastructure/onboardingSettings";
import { GetChapter, GetLevelProgress, GetNextChapter, GetOnboardingOptions, ListChapters, ListLevels, SubmitQuiz } from "../modules/learning/application/LearningUseCases";

// Progress (streak, XP, lencana)
import { PrismaActivityRecorder } from "../modules/progress/infrastructure/PrismaActivityRecorder";

// Notifikasi (in-app + Web Push)
import { PrismaNotificationRepository } from "../modules/notifications/infrastructure/PrismaNotificationRepository";
import { WebPushSender } from "../modules/notifications/infrastructure/WebPushSender";
import { NotificationService } from "../modules/notifications/application/NotificationService";

// SRS
import { PrismaSrsRepository } from "../modules/srs/infrastructure/PrismaSrsRepository";
import { GetDueCards, ReviewCard } from "../modules/srs/application/SrsUseCases";

// Conversation
import { PrismaConversationRepository } from "../modules/conversation/infrastructure/PrismaConversationRepository";

// Scanner
import { ScanVisionService } from "../modules/scan/infrastructure/scanVisionService";
import { ScanHistoryRepo } from "../modules/scan/infrastructure/scanHistoryRepo";
import { AnthropicChatProvider } from "../modules/conversation/infrastructure/AnthropicChatProvider";
import { MockChatProvider } from "../modules/conversation/infrastructure/MockChatProvider";
import { GroqChatProvider } from "../modules/conversation/infrastructure/GroqChatProvider";
import { EndConversation, ListScenarios, SendMessage, StartConversation } from "../modules/conversation/application/ConversationUseCases";

// Ask (Tanya Sensei)
import { AnthropicAskProvider } from "../modules/ask/infrastructure/AnthropicAskProvider";
import { GeminiAskProvider } from "../modules/ask/infrastructure/GeminiAskProvider";
import { GroqAskProvider } from "../modules/ask/infrastructure/GroqAskProvider";
import { MockAskProvider } from "../modules/ask/infrastructure/MockAskProvider";
import { GroqTranscriber } from "../modules/ask/infrastructure/GroqTranscriber";
import { loadAnswerKey, loadLearnerProfile } from "../modules/ask/infrastructure/PrismaLearnerProfile";
import { GeminiTts } from "../shared/infrastructure/geminiTts";
import { AskQuestion } from "../modules/ask/application/AskUseCase";


// Users (admin & super_admin)
import {
  PrismaAiPromptRepository,
  PrismaAuditLogger,
  PrismaSubscriptionAdminRepository,
  PrismaUserAdminRepository,
} from "../modules/users/infrastructure/PrismaUserAdmin";
import {
  ChangeUserRole,
  GetSystemStats,
  GrantSubscription,
  ListAiLevelPrompts,
  ListAuditLogs,
  SearchUsers,
  SuspendUser,
  UnsuspendUser,
  UpdateAiLevelPrompt,
} from "../modules/users/application/UserAdminUseCases";

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
  const resendKey = env.RESEND_API_KEY.trim();
  const webOrigin = env.WEB_ORIGIN.trim().replace(/\/+$/, "");
  const email = resendKey ? new ResendEmailSender(resendKey, env.EMAIL_FROM) : new ConsoleEmailSender();
  if (!resendKey && env.NODE_ENV === "production") {
    console.warn("[email] RESEND_API_KEY kosong: email verifikasi dan reset password hanya dicetak ke log, tidak terkirim.");
  }
  const refreshTtlDays = env.REFRESH_TOKEN_TTL_DAYS;

  const sessionIssuer = new SessionIssuer({ sessions, tokens, accessTokens, clock, refreshTtlDays });
  const sendVerification = new SendEmailVerification({ users, oneTimeTokens, tokens, email, clock, webOrigin });

  const oauthVerifier = env.GOOGLE_CLIENT_ID
    ? new GoogleOAuthVerifier(env.GOOGLE_CLIENT_ID)
    : new NotConfiguredOAuthVerifier();

  const auth = {
    register: new RegisterWithEmail({ users, hasher, sessions: sessionIssuer, sendVerification, clock }),
    login: new LoginWithEmail({ users, hasher, sessions: sessionIssuer, clock }),
    loginWithOAuth: new LoginWithOAuth({ users, oauthAccounts, verifier: oauthVerifier, sessions: sessionIssuer, clock }),
    startGuest: new StartGuestSession({ users, sessions: sessionIssuer }),
    refresh: new RefreshSession({ users, sessions, tokens, accessTokens, clock, refreshTtlDays }),
    logout: new Logout({ sessions, tokens, clock }),
    verifyEmail: new VerifyEmail({ users, oneTimeTokens, tokens, clock }),
    sendVerification,
    requestPasswordReset: new RequestPasswordReset({ users, oneTimeTokens, tokens, email, clock, webOrigin }),
    resetPassword: new ResetPassword({ users, oneTimeTokens, sessions, tokens, hasher, clock }),
    getCurrentUser: new GetCurrentUser({ users }),
    completeOnboarding: new CompleteOnboarding({ users, guard: new PrismaOnboardingGuard(db) }),
    updateAvatar: new UpdateAvatar({ users }),
    updateProfile: new UpdateProfile({ users }),
  };

  // ── Notifikasi ──
  const notifications = new NotificationService({
    repo: new PrismaNotificationRepository(db),
    push: new WebPushSender(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT, env.PUSH_TTL_SECONDS),
    publicKey: env.VAPID_PUBLIC_KEY,
    clock,
  });
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY kosong: push dimatikan, notifikasi in-app tetap berjalan.");
  }

  // ── Progress ──
  const activity = new PrismaActivityRecorder(db, clock, notifications);

  // ── Learning ──
  const learningRepo = new PrismaLearningRepository(db);
  const learning = {
    listLevels: new ListLevels({ repo: learningRepo }),
    listChapters: new ListChapters({ repo: learningRepo }),
    getChapter: new GetChapter({ repo: learningRepo }),
    getNextChapter: new GetNextChapter({ repo: learningRepo, users }),
    submitQuiz: new SubmitQuiz({ repo: learningRepo, clock, activity }),
    getLevelProgress: new GetLevelProgress({ repo: learningRepo }),
    getOnboardingOptions: new GetOnboardingOptions({ repo: learningRepo, loadConfig: () => loadOnboardingConfig(db) }),
  };

  // ── SRS ──
  const srsRepo = new PrismaSrsRepository(db);
  const srs = { getDue: new GetDueCards({ repo: srsRepo, clock }), review: new ReviewCard({ repo: srsRepo, clock, activity }) };

  // ── AI maskot (ngobrol & skenario) — prioritas: Anthropic → Groq → Mock ──
  const ai = env.ANTHROPIC_API_KEY
    ? new AnthropicChatProvider(env.ANTHROPIC_API_KEY, env.AI_MODEL)
    : env.GROQ_API_KEY
      ? new GroqChatProvider(env.GROQ_API_KEY)
      : new MockChatProvider();

  // ── Tanya Sensei (Q&A) — prioritas: Groq → Gemini → Anthropic → Mock ──
  const backupAskProvider = env.GEMINI_API_KEY
    ? new GeminiAskProvider(env.GEMINI_API_KEY)
    : env.ANTHROPIC_API_KEY
      ? new AnthropicAskProvider(env.ANTHROPIC_API_KEY, env.AI_MODEL)
      : new MockAskProvider();

  const askProvider = env.GROQ_API_KEY
    ? new GroqAskProvider(env.GROQ_API_KEY, backupAskProvider)
    : backupAskProvider;
  const askUc = {
    ask: new AskQuestion({
      ask: askProvider,
      userProfile: (id) => loadLearnerProfile(db, id),
      answerKey: (questionId) => loadAnswerKey(db, questionId),
    }),
  };
  const transcriber = env.GROQ_API_KEY ? new GroqTranscriber(env.GROQ_API_KEY) : null;
  const speaker = env.GEMINI_API_KEY ? new GeminiTts(env.GEMINI_API_KEY) : null;
  const convDeps = { repo: new PrismaConversationRepository(db), ai, clock, freeDailyLimit: env.FREE_DAILY_AI_SESSIONS, activity };
  const conversation = {
    start: new StartConversation(convDeps),
    send: new SendMessage(convDeps),
    end: new EndConversation(convDeps),
    scenarios: new ListScenarios(convDeps),
  };

  // ── Admin & Super Admin ──
  const adminRepo = new PrismaUserAdminRepository(db);
  const audit = new PrismaAuditLogger(db);
  const aiPromptRepo = new PrismaAiPromptRepository(db);
  const subscriptionRepo = new PrismaSubscriptionAdminRepository(db);

  const adminUsers = {
    search: new SearchUsers({ repo: adminRepo }),
    changeRole: new ChangeUserRole({ repo: adminRepo, audit }),
    suspend: new SuspendUser({ repo: adminRepo, audit, clock }),
    unsuspend: new UnsuspendUser({ repo: adminRepo, audit }),
    stats: new GetSystemStats({ repo: adminRepo }),
    auditLogs: new ListAuditLogs({ audit }),
    aiPrompts: {
      list: new ListAiLevelPrompts({ repo: aiPromptRepo }),
      update: new UpdateAiLevelPrompt({ repo: aiPromptRepo, audit }),
    },
    subscription: new GrantSubscription({ repo: subscriptionRepo, audit }),
  };

  const aiMode = env.ANTHROPIC_API_KEY ? "anthropic" : env.GROQ_API_KEY ? "groq" : env.GEMINI_API_KEY ? "gemini" : "mock";
  const scanVision = new ScanVisionService(env.GEMINI_API_KEY || "", env.GROQ_API_KEY || "");
  const scanHistory = new ScanHistoryRepo(db);

  return { accessTokens, activity, auth, learning, srs, conversation, adminUsers, askUc, transcriber, speaker, aiMode, notifications, scanVision, scanHistory };
}

export type Container = ReturnType<typeof buildContainer>;
