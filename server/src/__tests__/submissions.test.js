process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.FRONTEND_ORIGIN = "http://localhost:3000";

const request = require("supertest");

const mockSupabaseAdmin = {
  from: jest.fn(),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      remove: jest.fn(),
      createSignedUrl: jest.fn(),
    })),
  },
};

const mockAuthService = {
  verifyToken: jest.fn(),
};

jest.mock("../config/supabase", () => ({ supabaseAdmin: mockSupabaseAdmin }));
jest.mock("../services/authService", () => ({ authService: mockAuthService }));

const { app } = require("../app");

describe("Topic submissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects submissions to inactive topics", async () => {
    mockAuthService.verifyToken.mockResolvedValue({ sub: "user-1", email: "user@example.com" });

    const topicQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: "topic-1", status: "inactive", deleted_at: null, title: "Inactive" },
        error: null,
      }),
    };

    mockSupabaseAdmin.from.mockImplementation((table) => {
      if (table === "topics") return topicQuery;
      return topicQuery;
    });

    const response = await request(app)
      .post("/api/topics/11111111-1111-4111-8111-111111111111/submissions")
      .set("Authorization", "Bearer token")
      .attach("file", Buffer.from("proof"), "proof.pdf");

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/inactive/i);
  });

  it("allows admin to mark submission completed and writes audit log", async () => {
    mockAuthService.verifyToken.mockResolvedValue({ sub: "admin-1", email: "admin@example.com" });

    const userRoleQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    };

    const submissionQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "sub-1",
          status: "pending",
          topic_id: "topic-1",
          user_id: "user-1",
        },
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "sub-1",
          status: "completed",
          topic_id: "topic-1",
          user_id: "user-1",
        },
        error: null,
      }),
    };

    const topicProgressQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
    };

    const auditLogQuery = {
      insert: jest.fn().mockResolvedValue({ error: null }),
    };

    mockSupabaseAdmin.from.mockImplementation((table) => {
      if (table === "user_roles") return userRoleQuery;
      if (table === "topic_submissions") return submissionQuery;
      if (table === "topic_progress") return topicProgressQuery;
      if (table === "audit_logs") return auditLogQuery;
      return submissionQuery;
    });

    const response = await request(app)
      .patch("/api/submissions/22222222-2222-4222-8222-222222222222/status")
      .set("Authorization", "Bearer token")
      .send({ status: "completed", review_notes: "Looks good" });

    expect(response.status).toBe(200);
    expect(auditLogQuery.insert).toHaveBeenCalledTimes(1);
    expect(topicProgressQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        topic_id: "topic-1",
        user_id: "user-1",
        status: "completed",
      }),
      expect.any(Object)
    );
  });
});
