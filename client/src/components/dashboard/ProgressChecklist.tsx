import { useMemo, useState } from "react";
import type {
  Course,
  Enrollment,
  Lesson,
  LessonAssignment,
  LessonSubmission,
  LessonTopic,
} from "../../types/dashboard";

type ProgressChecklistProps = {
  courses: Course[];
  lessons: Lesson[];
  lessonTopics: LessonTopic[];
  lessonAssignments: LessonAssignment[];
  lessonSubmissions: LessonSubmission[];
  enrollments: Enrollment[];
  onToggle?: (payload: { assignmentId: string; status: string }) => void;
  onUploadProof?: (payload: { assignmentId: string; file: File }) => void;
  uploadingAssignmentId?: string | null;
  updatingAssignmentId?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const ProgressChecklist = ({
  courses,
  lessons,
  lessonTopics,
  lessonAssignments,
  lessonSubmissions,
  enrollments,
  onToggle,
  onUploadProof,
  uploadingAssignmentId,
  updatingAssignmentId,
}: ProgressChecklistProps) => {
  const enrolledCourseIds = useMemo(() => {
    const eligible = enrollments.filter((entry) =>
      ["approved", "active", "completed"].includes(entry.status ?? "")
    );
    return new Set(eligible.map((entry) => entry.course_id));
  }, [enrollments]);

  const enrolledCourses = courses.filter((course) => enrolledCourseIds.has(course.id));

  const lessonAssignmentMap = useMemo(() => {
    return new Map(lessonAssignments.map((assignment) => [assignment.lesson_id, assignment]));
  }, [lessonAssignments]);

  const topicMap = useMemo(() => {
    const map = new Map<string, LessonTopic[]>();
    lessonTopics.forEach((topic) => {
      const list = map.get(topic.lesson_id) ?? [];
      list.push(topic);
      map.set(topic.lesson_id, list);
    });
    map.forEach((list) => list.sort((a, b) => a.order_index - b.order_index));
    return map;
  }, [lessonTopics]);

  const submissionMap = useMemo(() => {
    const map = new Map<string, LessonSubmission>();
    lessonSubmissions.forEach((submission) => {
      map.set(submission.lesson_assignment_id, submission);
    });
    return map;
  }, [lessonSubmissions]);

  const [fileSelections, setFileSelections] = useState<Record<string, File | null>>({});

  if (enrolledCourses.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No enrolled learning paths yet. Your admin will assign training soon.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {enrolledCourses.map((course) => {
        const courseLessons = lessons
          .filter((lesson) => lesson.course_id === course.id)
          .sort((a, b) => a.order_index - b.order_index);

        return (
          <div
            key={course.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  Learning path
                </p>
                <h3 className="mt-2 font-display text-xl text-white">{course.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{course.description}</p>
              </div>
              <div className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300">
                {courseLessons.length} lessons
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {courseLessons.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Lessons will appear once the learning path is structured.
                </p>
              ) : (
                courseLessons.map((lesson) => {
                  const assignment = lessonAssignmentMap.get(lesson.id);
                  const topics = topicMap.get(lesson.id) ?? [];
                  const submission = assignment
                    ? submissionMap.get(assignment.id)
                    : undefined;
                  const isUploading = uploadingAssignmentId === assignment?.id;
                  const isUpdating = updatingAssignmentId === assignment?.id;
                  const fileKey = assignment?.id ?? lesson.id;
                  const selectedFile = fileSelections[fileKey] ?? null;

                  const submittedAt = assignment?.submitted_at;
                  const dueAt = assignment?.due_at;
                  const isLate =
                    submittedAt && dueAt
                      ? new Date(submittedAt).getTime() > new Date(dueAt).getTime()
                      : false;
                  const now = new Date().getTime();
                  const computedReview = assignment
                    ? assignment.review_status ??
                      (submittedAt
                        ? isLate
                          ? "late"
                          : "on_time"
                        : dueAt && new Date(dueAt).getTime() < now
                        ? "not_submitted"
                        : "pending")
                    : "unassigned";

                  const canToggleComplete = Boolean(submission);

                  return (
                    <div
                      key={lesson.id}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-white">{lesson.title}</p>
                          <p className="text-xs text-slate-400">
                            {lesson.duration_minutes
                              ? `${lesson.duration_minutes} min`
                              : "Self paced"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                            {assignment?.status ?? "unassigned"}
                          </span>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                            {computedReview.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
                        <div>
                          <p className="uppercase tracking-[0.2em] text-slate-500">Start</p>
                          <p className="mt-1 text-slate-300">{formatDate(assignment?.start_at)}</p>
                        </div>
                        <div>
                          <p className="uppercase tracking-[0.2em] text-slate-500">Due</p>
                          <p className="mt-1 text-slate-300">{formatDate(assignment?.due_at)}</p>
                        </div>
                      </div>
                      {topics.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                            Topics &amp; discussion
                          </p>
                          <ul className="space-y-2 text-sm text-slate-300">
                            {topics.map((topic) => (
                              <li key={topic.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                <p className="text-white">{topic.title}</p>
                                {topic.content && (
                                  <p className="text-xs text-slate-400">{topic.content}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_auto] lg:items-end">
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                            Upload proof (jpg/png)
                          </p>
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              setFileSelections((prev) => ({ ...prev, [fileKey]: file }));
                            }}
                            disabled={!assignment}
                            className="w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.2em] file:text-white"
                            aria-label={`Upload proof for ${lesson.title}`}
                          />
                          {submission && (
                            <p className="text-xs text-slate-400">
                              Submitted {formatDate(submission.submitted_at)} ({submission.file_type})
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (!assignment || !selectedFile) return;
                              onUploadProof?.({ assignmentId: assignment.id, file: selectedFile });
                            }}
                            disabled={!assignment || !selectedFile || isUploading}
                            className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUploading ? "Uploading..." : "Submit proof"}
                          </button>
                          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                            <input
                              type="checkbox"
                              checked={assignment?.status === "completed"}
                              disabled={!assignment || !canToggleComplete || isUpdating}
                              onChange={() => {
                                if (!assignment) return;
                                const nextStatus =
                                  assignment.status === "completed" ? "assigned" : "completed";
                                onToggle?.({ assignmentId: assignment.id, status: nextStatus });
                              }}
                              className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#7f5bff] focus:ring-[#7f5bff]"
                              aria-label={`Mark ${lesson.title} as completed`}
                            />
                            Mark complete
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProgressChecklist;
