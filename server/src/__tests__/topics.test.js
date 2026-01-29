process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.FRONTEND_ORIGIN = "http://localhost:3000";

const request = require("supertest");

const mockSupabaseAdmin = {
  from: jest.fn(),
};

const mockAuthService = {
  verifyToken: jest.fn(),
};

jest.mock("../config/supabase", () => ({ supabaseAdmin: mockSupabaseAdmin }));
jest.mock("../services/authService", () => ({ authService: mockAuthService }));

const { app } = require("../app");

describe("Topic metadata access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects admin edits to topic metadata", async () => {
    mockAuthService.verifyToken.mockResolvedValue({ sub: "admin-1", email: "admin@example.com" });

    const userRoleQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { role: "admin" },
        error: null,
      }),
    };

    mockSupabaseAdmin.from.mockImplementation((table) => {
      if (table === "user_roles") return userRoleQuery;
      return userRoleQuery;
    });

    const response = await request(app)
      .patch("/api/topics/33333333-3333-4333-8333-333333333333")
      .set("Authorization", "Bearer token")
      .send({ title: "Updated title" });

    expect(response.status).toBe(403);
  });
});
