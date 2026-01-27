import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { superAdminService } from "../../../services/superAdminService";
import type { AdminUser, Course, Enrollment } from "../../../types/superAdmin";

const CoursesSection = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formState, setFormState] = useState({ title: "", description: "", status: "draft" });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [endDate, setEndDate] = useState("");
  const [isEditEnrollmentOpen, setIsEditEnrollmentOpen] = useState(false);
  const [editEnrollmentState, setEditEnrollmentState] = useState({
    status: "pending",
    start_date: "",
    end_date: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseData, enrollmentData, userData] = await Promise.all([
        superAdminService.listCourses(),
        superAdminService.listEnrollments(),
        superAdminService.listUsers(),
      ]);
      setCourses(courseData);
      setEnrollments(enrollmentData);
      setUsers(userData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setSelectedCourse(null);
    setFormState({ title: "", description: "", status: "draft" });
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = (course: Course) => {
    setSelectedCourse(course);
    setFormState({
      title: course.title,
      description: course.description,
      status: course.status ?? "draft",
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setActionError(null);
    try {
      if (selectedCourse) {
        await superAdminService.updateCourse(selectedCourse.id, formState);
      } else {
        await superAdminService.createCourse(formState);
      }
      setIsFormOpen(false);
      await loadData();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to save course.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    const previous = courses;
    setCourses((prev) => prev.filter((course) => course.id !== courseId));
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.deleteCourse(courseId);
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Unable to delete course.");
      setCourses(previous);
    } finally {
      setSaving(false);
    }
  };

  const openApprove = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setEndDate("");
    setActionError(null);
    setIsApproveOpen(true);
  };

  const openEditEnrollment = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setEditEnrollmentState({
      status: enrollment.status ?? "pending",
      start_date: enrollment.start_date ? enrollment.start_date.slice(0, 10) : "",
      end_date: enrollment.end_date ? enrollment.end_date.slice(0, 10) : "",
    });
    setActionError(null);
    setIsEditEnrollmentOpen(true);
  };

  const handleSaveEnrollment = async () => {
    if (!selectedEnrollment) return;
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.updateEnrollmentStatus(selectedEnrollment.id, {
        status: editEnrollmentState.status,
        start_date: editEnrollmentState.start_date
          ? new Date(editEnrollmentState.start_date).toISOString()
          : null,
        end_date: editEnrollmentState.end_date
          ? new Date(editEnrollmentState.end_date).toISOString()
          : null,
      });
      setIsEditEnrollmentOpen(false);
      await loadData();
    } catch (saveError) {
      setActionError(
        saveError instanceof Error ? saveError.message : "Unable to update enrollment."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedEnrollment) return;
    setEnrollments((prev) =>
      prev.map((entry) =>
        entry.id === selectedEnrollment.id
          ? {
              ...entry,
              status: "approved",
              start_date: new Date().toISOString(),
              end_date: endDate ? new Date(endDate).toISOString() : null,
            }
          : entry
      )
    );
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.updateEnrollmentStatus(selectedEnrollment.id, {
        status: "approved",
        start_date: new Date().toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
      });
      setIsApproveOpen(false);
    } catch (approveError) {
      setActionError(
        approveError instanceof Error ? approveError.message : "Unable to approve enrollment."
      );
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (enrollmentId: string) => {
    setEnrollments((prev) =>
      prev.map((entry) => (entry.id === enrollmentId ? { ...entry, status: "rejected" } : entry))
    );
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.updateEnrollmentStatus(enrollmentId, { status: "rejected" });
    } catch (rejectError) {
      setActionError(
        rejectError instanceof Error ? rejectError.message : "Unable to reject enrollment."
      );
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const pendingEnrollments = enrollments.filter((item) => item.status === "pending");

  const courseColumns = useMemo(
    () => [
      {
        key: "course",
        header: "Course",
        render: (course: Course) => (
          <div>
            <p className="font-semibold text-white">{course.title}</p>
            <p className="text-xs text-slate-400">{course.description}</p>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (course: Course) => (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            {course.status ?? "draft"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (course: Course) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(course)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(course.id)}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const enrollmentColumns = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        render: (enrollment: Enrollment) => (
          <span className="text-xs text-slate-300">
            {users.find((user) => user.id === enrollment.user_id)?.email ?? enrollment.user_id}
          </span>
        ),
      },
      {
        key: "course",
        header: "Course",
        render: (enrollment: Enrollment) => (
          <span className="text-xs text-slate-300">
            {courses.find((course) => course.id === enrollment.course_id)?.title ??
              enrollment.course_id}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (enrollment: Enrollment) => (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            {enrollment.status ?? "pending"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (enrollment: Enrollment) => {
          const isPending = (enrollment.status ?? "pending") === "pending";
          return (
            <div className="flex flex-wrap items-center gap-2">
              {isPending && (
                <button
                  type="button"
                  onClick={() => openApprove(enrollment)}
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200"
                >
                  Approve
                </button>
              )}
              {isPending && (
                <button
                  type="button"
                  onClick={() => handleReject(enrollment.id)}
                  className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200"
                >
                  Reject
                </button>
              )}
              <button
                type="button"
                onClick={() => openEditEnrollment(enrollment)}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
              >
                Edit
              </button>
            </div>
          );
        },
      },
    ],
    [courses, users]
  );

  if (loading) {
    return <p className="text-sm text-slate-400">Loading courses...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-200">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">Courses</h2>
          <p className="text-sm text-slate-300">Manage course catalog and approvals.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90"
        >
          New course
        </button>
      </div>

      <DataTable columns={courseColumns} data={courses} emptyMessage="No courses yet." />
      {actionError && <p className="text-xs text-rose-200">{actionError}</p>}

      <div>
        <h3 className="font-display text-xl text-white">Pending enrollments</h3>
        <p className="text-sm text-slate-400">
          Approve or reject enrollments before learners start.
        </p>
        <div className="mt-4">
          <DataTable
            columns={enrollmentColumns}
            data={pendingEnrollments}
            emptyMessage="No pending enrollments."
          />
        </div>
      </div>

      <div>
        <h3 className="font-display text-xl text-white">All enrollments</h3>
        <p className="text-sm text-slate-400">
          Edit statuses, start dates, and end dates for enrolled users.
        </p>
        <div className="mt-4">
          <DataTable
            columns={enrollmentColumns}
            data={enrollments}
            emptyMessage="No enrollments yet."
          />
        </div>
      </div>

      <Modal
        isOpen={isFormOpen}
        title={selectedCourse ? "Edit course" : "Create course"}
        onClose={() => setIsFormOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Title
            <input
              type="text"
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Description
            <textarea
              value={formState.description}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Status
            <select
              value={formState.status}
              onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </label>
        </div>
        {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
      </Modal>

      <Modal
        isOpen={isApproveOpen}
        title="Approve enrollment"
        description="Select a target completion date."
        onClose={() => setIsApproveOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsApproveOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-emerald-200"
            >
              {saving ? "Saving..." : "Approve"}
            </button>
          </>
        }
      >
        <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
          End date
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
          />
        </label>
        {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
      </Modal>

      <Modal
        isOpen={isEditEnrollmentOpen}
        title="Edit enrollment"
        description="Update enrollment status and dates."
        onClose={() => setIsEditEnrollmentOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsEditEnrollmentOpen(false)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEnrollment}
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Status
            <select
              value={editEnrollmentState.status}
              onChange={(event) =>
                setEditEnrollmentState((prev) => ({ ...prev, status: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            >
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="active">active</option>
              <option value="completed">completed</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Start date
            <input
              type="date"
              value={editEnrollmentState.start_date}
              onChange={(event) =>
                setEditEnrollmentState((prev) => ({ ...prev, start_date: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            End date
            <input
              type="date"
              value={editEnrollmentState.end_date}
              onChange={(event) =>
                setEditEnrollmentState((prev) => ({ ...prev, end_date: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
        </div>
        {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
      </Modal>
    </div>
  );
};

export default CoursesSection;
