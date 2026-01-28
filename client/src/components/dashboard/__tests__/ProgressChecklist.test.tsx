import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProgressChecklist from "../ProgressChecklist";

describe("ProgressChecklist", () => {
  it("toggles a lesson and notifies the handler", () => {
    const onToggle = vi.fn();
    render(
      <ProgressChecklist
        courses={[
          { id: "course-1", title: "Course One", description: "Test course" },
        ]}
        lessons={[
          { id: "lesson-1", course_id: "course-1", title: "Lesson One", order_index: 1 },
        ]}
        lessonTopics={[]}
        lessonAssignments={[
          {
            id: "assign-1",
            user_id: "user-1",
            course_id: "course-1",
            lesson_id: "lesson-1",
            status: "assigned",
          },
        ]}
        lessonSubmissions={[
          {
            id: "submission-1",
            lesson_assignment_id: "assign-1",
            user_id: "user-1",
            file_path: "proof.png",
            file_type: "image/png",
          },
        ]}
        enrollments={[
          { id: "enroll-1", user_id: "user-1", course_id: "course-1", status: "active" },
        ]}
        onToggle={onToggle}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /lesson one/i });
    fireEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith({ assignmentId: "assign-1", status: "completed" });
  });
});
