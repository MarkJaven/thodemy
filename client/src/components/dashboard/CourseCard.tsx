import type { Course } from "../../types/dashboard";

type CourseCardProps = {
  course: Course;
  isEnrolled?: boolean;
  enrollmentStatus?: string | null;
  onEnroll?: () => void;
  isSubmitting?: boolean;
};

const CourseCard = ({
  course,
  isEnrolled,
  enrollmentStatus,
  onEnroll,
  isSubmitting,
}: CourseCardProps) => {
  const statusLabel = enrollmentStatus
    ? enrollmentStatus.replace(/_/g, " ")
    : isEnrolled
    ? "enrolled"
    : "";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(10,8,18,0.35)]">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
            {course.category || "Course"}
          </p>
          <h3 className="mt-2 font-display text-xl text-white">{course.title}</h3>
        </div>
        <p className="text-sm text-slate-300">{course.description}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 px-3 py-1">
            {course.level || "All Levels"}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            {course.duration_hours ? `${course.duration_hours}h` : "Self paced"}
          </span>
          {statusLabel && (
            <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.2em]">
              {statusLabel}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onEnroll}
          disabled={isEnrolled || isSubmitting}
          title={isEnrolled ? "Already enrolled" : "Enroll in this course"}
          className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Enrolling..." : isEnrolled ? "Enrolled" : "Enroll"}
        </button>
      </div>
    </div>
  );
};

export default CourseCard;
