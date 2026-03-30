const { supabaseAdmin } = require("../config/supabase");
const { BadRequestError, ExternalServiceError, NotFoundError } = require("../utils/errors");
const { sendSuccess } = require("../utils/responses");

/**
 * Return forms visible to the authenticated user.
 * Strips link_url so it is never exposed to the client.
 * Includes a `submitted_at` field from form_responses.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const listUserForms = async (req, res, next) => {
  try {
    const userId = req.auth.sub;

    const { data: forms, error } = await supabaseAdmin
      .from("forms")
      .select("id, title, description, status, assigned_user_id, link_url, start_at, end_at")
      .eq("status", "active")
      .or(`assigned_user_id.eq.${userId},assigned_user_id.is.null`)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ExternalServiceError("Unable to load forms", {
        details: error.message,
      });
    }

    const formIds = (forms ?? []).map((f) => f.id);

    const responseLookup = {};
    if (formIds.length > 0) {
      const { data: responses, error: respError } = await supabaseAdmin
        .from("form_responses")
        .select("form_id, submitted_at")
        .eq("user_id", userId)
        .in("form_id", formIds)
        .order("submitted_at", { ascending: false });

      if (!respError && responses) {
        for (const r of responses) {
          if (!responseLookup[r.form_id]) {
            responseLookup[r.form_id] = r.submitted_at;
          }
        }
      }
    }

    const result = (forms ?? []).map((form) => ({
      id: form.id,
      title: form.title,
      description: form.description,
      status: form.status,
      assigned_user_id: form.assigned_user_id,
      start_at: form.start_at,
      end_at: form.end_at,
      has_link: Boolean(form.link_url),
      submitted_at: responseLookup[form.id] || null,
    }));

    return sendSuccess(res, { data: result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Return the form link URL so the client can open it.
 * Validates access and availability before revealing the URL.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const getFormLink = async (req, res, next) => {
  try {
    const { formId } = req.params;
    if (!formId) {
      throw new BadRequestError("formId is required");
    }

    const userId = req.auth.sub;

    const { data: form, error } = await supabaseAdmin
      .from("forms")
      .select("id, link_url, status, assigned_user_id, start_at, end_at")
      .eq("id", formId)
      .maybeSingle();

    if (error) {
      throw new ExternalServiceError("Unable to load form", {
        details: error.message,
      });
    }

    if (!form) {
      throw new NotFoundError("Form not found");
    }

    if (form.assigned_user_id && form.assigned_user_id !== userId) {
      throw new NotFoundError("Form not found");
    }

    const now = new Date();
    if (form.start_at && now < new Date(form.start_at)) {
      throw new BadRequestError("This form is not yet open");
    }
    if (form.end_at && now > new Date(form.end_at)) {
      throw new BadRequestError("This form has closed");
    }

    if (!form.link_url) {
      throw new BadRequestError("Form link is not available");
    }

    return sendSuccess(res, { data: { url: form.link_url } });
  } catch (error) {
    return next(error);
  }
};

module.exports = { formController: { listUserForms, getFormLink } };
