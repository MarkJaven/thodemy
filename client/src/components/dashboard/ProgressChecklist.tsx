import { useEffect, useMemo, useState } from "react";
import type { Course, Enrollment, Lesson, UserProgress } from "../../types/dashboard";

type ProgressChecklistProps = {
  courses: Course[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  progress: UserProgress[];
  onToggle?: (payload: { lessonId: string; completed: boolean }) => void;
  isUpdating?: boolean;
};

const buildProgressMap = (entries: UserProgress[]) =>
  entries.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.lesson_id] = item.completed;
    return acc;
  }, {});

const ProgressChecklist = ({
  courses,
  lessons,
  enrollments,
  progress,
  onToggle,
  isUpdating,
}: ProgressChecklistProps) => {
  const enrolledCourseIds = useMemo(() => {
    const eligible = enrollments.filter((entry) =>
      ["approved", "active", "completed"].includes(entry.status ?? "")
    );
    return new Set(eligible.map((entry) => entry.course_id));
  }, [enrollments]);

  const [localProgress, setLocalProgress] = useState<Record<string, boolean>>(
    buildProgressMap(progress)
  );

  useEffect(() => {
    setLocalProgress(buildProgressMap(progress));
  }, [progress]);

  const enrolledCourses = courses.filter((course) => enrolledCourseIds.has(course.id));

  if (enrolledCourses.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No enrolled courses yet. Your admin will assign training soon.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {enrolledCourses.map((course) => {
        const courseLessons = lessons
          .filter((lesson) => lesson.course_id === course.id)
          .sort((a, b) => a.order_index - b.order_index);
        const completedCount = courseLessons.filter(
          (lesson) => localProgress[lesson.id]
        ).length;

        return (
          <div
            key={course.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  Enrolled Course
                </p>
                <h3 className="mt-2 font-display text-xl text-white">{course.title}</h3>
              </div>
              <div className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300">
                {completedCount}/{courseLessons.length} lessons completed
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {courseLessons.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Lessons will appear once the course is published.
                </p>
              ) : (
                courseLessons.map((lesson) => {
                  const isChecked = Boolean(localProgress[lesson.id]);
                  return (
                    <label
                      key={lesson.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="text-white">{lesson.title}</p>
                        <p className="text-xs text-slate-400">
                          {lesson.duration_minutes ? `${lesson.duration_minutes} min` : "Self paced"}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        aria-label={`Mark ${lesson.title} as complete`}
                        checked={isChecked}
                        onChange={() => {
                          const nextValue = !isChecked;
                          setLocalProgress((prev) => ({ ...prev, [lesson.id]: nextValue }));
                          onToggle?.({ lessonId: lesson.id, completed: nextValue });
                        }}
                        className="h-5 w-5 rounded border-white/20 bg-white/10 text-[#7f5bff] focus:ring-[#7f5bff]"
                      />
                    </label>
                  );
                })
              )}
            </div>
            {isUpdating && (
              <p className="mt-3 text-xs text-slate-400" aria-live="polite">
                Saving progress...
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressChecklist;
