import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { superAdminService } from "../../../services/superAdminService";
import type { AdminUser, Form } from "../../../types/superAdmin";

const FormsSection = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    status: "active",
    assigned_user_id: "",
    link_url: "",
    start_at: "",
    end_at: "",
  });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [formData, userData] = await Promise.all([
        superAdminService.listForms(),
        superAdminService.listUsers(),
      ]);
      setForms(formData);
      setUsers(userData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load forms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setSelectedForm(null);
    setFormState({
      title: "",
      description: "",
      status: "active",
      assigned_user_id: "",
      link_url: "",
      start_at: "",
      end_at: "",
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = async (form: Form) => {
    setSelectedForm(form);
    setFormState({
      title: form.title,
      description: form.description,
      status: form.status ?? "active",
      assigned_user_id: form.assigned_user_id ?? "",
      link_url: form.link_url ?? "",
      start_at: form.start_at ? form.start_at.slice(0, 16) : "",
      end_at: form.end_at ? form.end_at.slice(0, 16) : "",
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setActionError(null);
    try {
      if (selectedForm) {
        await superAdminService.updateForm({
          formId: selectedForm.id,
          updates: {
            title: formState.title,
            description: formState.description,
            status: formState.status,
            assigned_user_id: formState.assigned_user_id || null,
            link_url: formState.link_url || null,
            start_at: formState.start_at ? new Date(formState.start_at).toISOString() : null,
            end_at: formState.end_at ? new Date(formState.end_at).toISOString() : null,
          },
          questions: [],
        });
      } else {
        await superAdminService.createForm({
          form: {
            title: formState.title,
            description: formState.description,
            status: formState.status,
            assigned_user_id: formState.assigned_user_id || null,
            link_url: formState.link_url || null,
            start_at: formState.start_at ? new Date(formState.start_at).toISOString() : null,
            end_at: formState.end_at ? new Date(formState.end_at).toISOString() : null,
          },
          questions: [],
        });
      }
      setIsFormOpen(false);
      await loadData();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to save form.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (formId: string) => {
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.deleteForm(formId);
      await loadData();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Unable to delete form.");
    } finally {
      setSaving(false);
    }
  };

  const formColumns = useMemo(
    () => [
      {
        key: "form",
        header: "Form",
        render: (form: Form) => (
          <div>
            <p className="font-semibold text-white">{form.title}</p>
            <p className="text-xs text-slate-400">{form.description}</p>
          </div>
        ),
      },
      {
        key: "assigned",
        header: "Assigned user",
        render: (form: Form) => (
          <span className="text-xs text-slate-400">
            {form.assigned_user_id
              ? users.find((user) => user.id === form.assigned_user_id)?.email ??
                form.assigned_user_id
              : "All users"}
          </span>
        ),
      },
      {
        key: "window",
        header: "Window",
        render: (form: Form) => (
          <span className="text-xs text-slate-400">
            {form.start_at ? new Date(form.start_at).toLocaleString() : "Anytime"}{" "}
            {form.end_at ? `→ ${new Date(form.end_at).toLocaleString()}` : ""}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (form: Form) => (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            {form.status ?? "active"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (form: Form) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(form)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(form.id)}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [users]
  );

  if (loading) {
    return <p className="text-sm text-slate-400">Loading forms...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-200">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">Forms</h2>
          <p className="text-sm text-slate-300">Assign surveys and review responses.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90"
        >
          New form
        </button>
      </div>

      <DataTable columns={formColumns} data={forms} emptyMessage="No forms created yet." />

      {actionError && <p className="text-xs text-rose-200">{actionError}</p>}

      <Modal
        isOpen={isFormOpen}
        title={selectedForm ? "Edit form" : "Create form"}
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
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Status
              <select
                value={formState.status}
                onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Assigned user
              <select
                value={formState.assigned_user_id}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, assigned_user_id: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              >
                <option value="">All users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Microsoft Forms link
              <input
                type="url"
                value={formState.link_url}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, link_url: event.target.value }))
                }
                placeholder="https://forms.office.com/..."
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              />
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Start date/time
              <input
                type="datetime-local"
                value={formState.start_at}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, start_at: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              />
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              End date/time
              <input
                type="datetime-local"
                value={formState.end_at}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, end_at: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              />
            </label>
          </div>
        </div>
        {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
      </Modal>
    </div>
  );
};

export default FormsSection;
