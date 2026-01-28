import { supabase } from "../lib/supabaseClient";
import type { Topic, UserProfile } from "../types/superAdmin";

const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
};

const generateCourseCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export type CourseSummary = {
  id: string;
  title: string;
  description: string;
  status?: string | null;
  topic_ids?: string[] | null;
  topic_prerequisites?: Record<string, string[]> | null;
  topic_corequisites?: Record<string, string[]> | null;
  total_hours?: number | null;
  total_days?: number | null;
  course_code?: string | null;
  enrollment_enabled?: boolean | null;
  enrollment_limit?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  enrollment_count?: number | null;
};

export type CourseDetail = {
  course: CourseSummary;
  topics: Topic[];
  enrollments: Array<{
    id: string;
    user_id: string;
    status?: string | null;
    enrolled_at?: string | null;
    user?: {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      username?: string | null;
      email?: string | null;
    } | null;
  }>;
  topicProgress: Array<{
    id: string;
    user_id: string;
    topic_id: string;
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }>;
};

export const adminCourseService = {
  async listCourses(): Promise<CourseSummary[]> {
    const client = requireSupabase();

    // Fetch courses
    const { data: courses, error: courseError } = await client
      .from("courses")
      .select(
        "id, title, description, status, topic_ids, topic_prerequisites, topic_corequisites, total_hours, total_days, course_code, enrollment_enabled, enrollment_limit, start_at, end_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (courseError) throw new Error(courseError.message);

    // Fetch enrollment counts
    const { data: enrollments, error: enrollmentError } = await client
      .from("enrollments")
      .select("course_id");

    if (enrollmentError) throw new Error(enrollmentError.message);

    // Count enrollments per course
    const enrollmentCounts = new Map<string, number>();
    (enrollments ?? []).forEach((e) => {
      const count = enrollmentCounts.get(e.course_id) ?? 0;
      enrollmentCounts.set(e.course_id, count + 1);
    });

    return (courses ?? []).map((course) => ({
      ...course,
      enrollment_count: enrollmentCounts.get(course.id) ?? 0,
    })) as CourseSummary[];
  },

  async getCourseDetail(courseId: string): Promise<CourseDetail> {
    const client = requireSupabase();

    // Fetch course
    const { data: course, error: courseError } = await client
      .from("courses")
      .select(
        "id, title, description, status, topic_ids, topic_prerequisites, topic_corequisites, total_hours, total_days, course_code, enrollment_enabled, enrollment_limit, start_at, end_at"
      )
      .eq("id", courseId)
      .single();

    if (courseError) throw new Error(courseError.message);

    // Fetch all topics
    const { data: allTopics, error: topicsError } = await client
      .from("topics")
      .select("id, title, description, time_allocated, time_unit");

    if (topicsError) throw new Error(topicsError.message);

    // Fetch enrollments for this course
    const { data: enrollments, error: enrollmentError } = await client
      .from("enrollments")
      .select("id, user_id, status, created_at")
      .eq("course_id", courseId);

    if (enrollmentError) throw new Error(enrollmentError.message);

    // Fetch profiles for enrolled users
    const userIds = (enrollments ?? []).map((e) => e.user_id);
    let profiles: UserProfile[] = [];
    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await client
        .from("profiles")
        .select("id, first_name, last_name, username, email")
        .in("id", userIds);

      if (profileError) throw new Error(profileError.message);
      profiles = profileData ?? [];
    }

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // Fetch topic progress for enrolled users
    let topicProgress: CourseDetail["topicProgress"] = [];
    if (userIds.length > 0) {
      const { data: progressData, error: progressError } = await client
        .from("topic_progress")
        .select("id, user_id, topic_id, status, start_date, end_date")
        .in("user_id", userIds);

      if (!progressError && progressData) {
        topicProgress = progressData;
      }
    }

    return {
      course: course as CourseSummary,
      topics: (allTopics ?? []) as Topic[],
      enrollments: (enrollments ?? []).map((e) => ({
        id: e.id,
        user_id: e.user_id,
        status: e.status,
        enrolled_at: e.created_at,
        user: profileMap.get(e.user_id) ?? null,
      })),
      topicProgress,
    };
  },

  async createCourse(payload: {
    title: string;
    description: string;
    status?: string;
    enrollment_enabled?: boolean;
    enrollment_limit?: number | null;
    start_at?: string | null;
    topic_ids?: string[];
    topic_prerequisites?: Record<string, string[]>;
    topic_corequisites?: Record<string, string[]>;
  }): Promise<CourseSummary> {
    const client = requireSupabase();

    // Fetch topics to calculate hours
    let totalHours = 0;
    if (payload.topic_ids && payload.topic_ids.length > 0) {
      const { data: topics, error: topicsError } = await client
        .from("topics")
        .select("id, time_allocated, time_unit")
        .in("id", payload.topic_ids);

      if (topicsError) throw new Error(topicsError.message);

      totalHours = (topics ?? []).reduce((sum, topic) => {
        const hours = Number(topic.time_allocated ?? 0);
        if (topic.time_unit === "days") {
          return sum + hours * 8;
        }
        return sum + hours;
      }, 0);
    }

    const totalDays = totalHours > 0 ? Math.ceil(totalHours / 8) : 0;

    // Calculate end date if start_at is provided
    let endAt: string | null = null;
    if (payload.start_at && totalDays > 0) {
      const startDate = new Date(payload.start_at);
      let daysAdded = 0;
      const currentDate = new Date(startDate);
      while (daysAdded < totalDays) {
        currentDate.setDate(currentDate.getDate() + 1);
        const day = currentDate.getDay();
        if (day !== 0 && day !== 6) {
          daysAdded++;
        }
      }
      endAt = currentDate.toISOString();
    }

    const courseCode = generateCourseCode();

    const { data, error } = await client
      .from("courses")
      .insert({
        title: payload.title,
        description: payload.description,
        status: payload.status ?? "draft",
        enrollment_enabled: payload.enrollment_enabled ?? true,
        enrollment_limit: payload.enrollment_limit ?? null,
        start_at: payload.start_at ?? null,
        end_at: endAt,
        topic_ids: payload.topic_ids ?? [],
        topic_prerequisites: payload.topic_prerequisites ?? {},
        topic_corequisites: payload.topic_corequisites ?? {},
        total_hours: totalHours,
        total_days: totalDays,
        course_code: courseCode,
      })
      .select(
        "id, title, description, status, topic_ids, topic_prerequisites, topic_corequisites, total_hours, total_days, course_code, enrollment_enabled, enrollment_limit, start_at, end_at"
      )
      .single();

    if (error) throw new Error(error.message);
    return data as CourseSummary;
  },

  async updateCourse(
    courseId: string,
    payload: {
      title?: string;
      description?: string;
      status?: string;
      enrollment_enabled?: boolean;
      enrollment_limit?: number | null;
      start_at?: string | null;
      topic_ids?: string[];
      topic_prerequisites?: Record<string, string[]>;
      topic_corequisites?: Record<string, string[]>;
      regenerate_code?: boolean;
    }
  ): Promise<void> {
    const client = requireSupabase();

    const updates: Record<string, unknown> = {};

    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.enrollment_enabled !== undefined) updates.enrollment_enabled = payload.enrollment_enabled;
    if (payload.enrollment_limit !== undefined) updates.enrollment_limit = payload.enrollment_limit;
    if (payload.start_at !== undefined) updates.start_at = payload.start_at;
    if (payload.topic_ids !== undefined) updates.topic_ids = payload.topic_ids;
    if (payload.topic_prerequisites !== undefined) updates.topic_prerequisites = payload.topic_prerequisites;
    if (payload.topic_corequisites !== undefined) updates.topic_corequisites = payload.topic_corequisites;

    if (payload.regenerate_code) {
      updates.course_code = generateCourseCode();
    }

    // Recalculate hours if topic_ids changed
    if (payload.topic_ids !== undefined) {
      let totalHours = 0;
      if (payload.topic_ids.length > 0) {
        const { data: topics, error: topicsError } = await client
          .from("topics")
          .select("id, time_allocated, time_unit")
          .in("id", payload.topic_ids);

        if (topicsError) throw new Error(topicsError.message);

        totalHours = (topics ?? []).reduce((sum, topic) => {
          const hours = Number(topic.time_allocated ?? 0);
          if (topic.time_unit === "days") {
            return sum + hours * 8;
          }
          return sum + hours;
        }, 0);
      }

      const totalDays = totalHours > 0 ? Math.ceil(totalHours / 8) : 0;
      updates.total_hours = totalHours;
      updates.total_days = totalDays;

      // Calculate end date
      const startAt = payload.start_at !== undefined ? payload.start_at : null;
      if (startAt && totalDays > 0) {
        const startDate = new Date(startAt);
        let daysAdded = 0;
        const currentDate = new Date(startDate);
        while (daysAdded < totalDays) {
          currentDate.setDate(currentDate.getDate() + 1);
          const day = currentDate.getDay();
          if (day !== 0 && day !== 6) {
            daysAdded++;
          }
        }
        updates.end_at = currentDate.toISOString();
      } else if (!startAt) {
        updates.end_at = null;
      }
    }

    const { error } = await client.from("courses").update(updates).eq("id", courseId);
    if (error) throw new Error(error.message);
  },

  async deleteCourse(courseId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("courses").delete().eq("id", courseId);
    if (error) throw new Error(error.message);
  },

  async updateEnrollmentStatus(enrollmentId: string, status: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client
      .from("enrollments")
      .update({ status })
      .eq("id", enrollmentId);
    if (error) throw new Error(error.message);
  },
};
