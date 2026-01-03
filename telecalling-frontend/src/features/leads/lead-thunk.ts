import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiRequestLite } from "@/api/api-lite";
import type { Lead } from "./lead-slice";




// 🔹 Fetch all leads
export const fetchLeads = createAsyncThunk<any, any, { rejectValue: string }>(
  "leads/fetchLeads",
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();
      const data = await apiRequestLite(
        `/leads?${query}`,
        "GET",
        undefined,
        true
      );
      return data;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      return rejectWithValue("Failed to fetch leads");
    }
  }
);

// 🔹 Fetch single lead
export const fetchLeadById = createAsyncThunk<
  any,
  string,
  { rejectValue: string }
>("leads/fetchLeadById", async (id, { rejectWithValue }) => {
  try {
    const data = await apiRequestLite(`/leads/${id}`, "GET", undefined, true);
    return data;
  } catch {
    return rejectWithValue("Failed to fetch lead details");
  }
});

// 🔹 Create a new lead
export const createLead = createAsyncThunk<any, any, { rejectValue: string }>(
  "leads/createLead",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await apiRequestLite("/leads", "POST", payload, true);
      return data;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      
      return rejectWithValue("Failed to create lead" );

    }
  }
);

// 🔹 Update existing lead - UPDATED to accept behaviour
export const updateLead = createAsyncThunk<
  any,
  { id: string; data: Partial<Lead> },
  { rejectValue: string }
>("leads/updateLead", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await apiRequestLite(`/leads/${id}`, "PUT", data, true);
    return res;
  } catch {
    return rejectWithValue("Failed to update lead");
  }
});

export const deleteLead = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("leads/deleteLead", async (id, { rejectWithValue }) => {
  try {
    await apiRequestLite(`/leads/${id}`, "DELETE", undefined, true);
    return id;
  } catch {
    return rejectWithValue("Failed to delete lead");
  }
});

// 🔹 Bulk update leads - UPDATED to accept behaviour
export const bulkUpdateLeads = createAsyncThunk<
  any,
  { ids: string[]; status?: string; behaviour?: string },
  { rejectValue: string }
>(
  "leads/bulkUpdate",
  async ({ ids, status, behaviour }, { rejectWithValue }) => {
    try {
      const data = await apiRequestLite(
        "/leads/bulk",
        "PUT",
        { ids, status, behaviour },
        true
      );
      return data;
    } catch {
      return rejectWithValue("Failed to update leads");
    }
  }
);

// 🔹 Bulk assign leads to a leader or telecaller
export const bulkAssignLeads = createAsyncThunk<
  any,
  { ids: string[]; leaderId?: string; assignedTo?: string },
  { rejectValue: string }
>("leads/bulkAssign", async (payload, { rejectWithValue }) => {
  try {
    const data = await apiRequestLite(
      "/leads/bulk/assign",
      "PUT",
      payload,
      true
    );
    return data;
  } catch {
    return rejectWithValue("Failed to assign leads");
  }
});

// 🔹 Update Lead Status
export const updateLeadStatus = createAsyncThunk<
  any,
  { id: string; status: string; notes?: string; nextCallDate?: string },
  { rejectValue: string }
>(
  "leads/updateLeadStatus",
  async ({ id, status, notes, nextCallDate }, { rejectWithValue }) => {
    try {
      const data = await apiRequestLite(
        `/leads/${id}/status`,
        "PATCH",
        { status, notes, nextCallDate },
        true
      );
      return data.lead; // backend returns { success, lead }
    } catch {
      return rejectWithValue("Failed to update lead status");
    }
  }
);

// 🔹 NEW: Update Lead Behaviour
export const updateLeadBehaviour = createAsyncThunk<
  any,
  { id: string; behaviour: string },
  { rejectValue: string }
>(
  "leads/updateLeadBehaviour",
  async ({ id, behaviour }, { rejectWithValue }) => {
    try {
      const data = await apiRequestLite(
        `/leads/${id}/behaviour`,
        "PATCH",
        { behaviour },
        true
      );
      return data.lead; // backend returns { success, lead }
    } catch {
      return rejectWithValue("Failed to update lead behaviour");
    }
  }
);

// Bulk Upload Leads via CSV/Excel
export const bulkUploadLeads = createAsyncThunk<
  any,
  File,
  { rejectValue: string }
>("leads/bulkUpload", async (file, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const data = await apiRequestLite(
      "/leads/upload-csv",
      "POST",
      formData,
      true 
    );

    return data;
  } catch (err: any) {
    return rejectWithValue(
      err?.response?.data?.error || "CSV upload failed"
    );
  }
});

// --- keep your imports and other thunks as-is ---

// Small helper to force a browser download
const forceDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "leads_export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// Build absolute API URL like apiRequestLite does
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "";
const buildApiUrl = (pathWithQuery: string) => {
  if (!API_BASE) return pathWithQuery; // same-origin fallback
  const base = API_BASE.replace(/\/+$/, "");
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${base}${path}`;
};

// Raw download with auth, avoiding apiRequestLite JSON parsing
const apiDownload = async (pathWithQuery: string, auth = true) => {
  const headers: Record<string, string> = {
    Accept:
      "text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;q=0.9, */*;q=0.8",
  };
  if (auth) {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("token") ||
      "";
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const url = buildApiUrl(pathWithQuery);
  const res = await fetch(url, { method: "GET", headers, credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Export failed with ${res.status}`);
  }

  const cd = res.headers.get("Content-Disposition") || "";
  const ct = res.headers.get("Content-Type") || "";
  const blob = await res.blob();

  // Try to extract filename from Content-Disposition
  let filename = "leads_export.csv";
  const matchStar = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  const matchSimple = /filename="?([^"]+)"?/i.exec(cd);
  if (matchStar?.[1]) filename = decodeURIComponent(matchStar[1]);
  else if (matchSimple?.[1]) filename = matchSimple[1];

  return { blob, filename, contentType: ct, size: blob.size };
};

/**
 * Export leads and trigger browser download.
 * Backend query keys supported here:
 * - scope: 'all' | 'today' | 'date' | 'range'
 * - status: csv string or string[] ('new,in_progress' or ['new','in_progress'])
 * - date: YYYY-MM-DD
 * - start/end: YYYY-MM-DD (range)
 * - format: 'xlsx' | 'csv'
 * - tz, includeUsers: optional
 *
 * Back-compat:
 * - If caller passes startDate/endDate, we map them to start/end.
 */
export const exportLeadsFile = createAsyncThunk<
  { filename: string; size: number; contentType: string },
  any | void,
  { rejectValue: string }
>("leads/exportFile", async (params = {}, { rejectWithValue }) => {
  try {
    const q = new URLSearchParams();

    // format
    if (params.format) q.set("format", String(params.format));

    // scope
    if (params.scope) q.set("scope", String(params.scope));

    // status: allow array OR csv string
    if (params.status != null) {
      if (Array.isArray(params.status)) {
        if (params.status.length) q.set("status", params.status.join(","));
      } else if (typeof params.status === "string") {
        if (params.status.trim().length) q.set("status", params.status.trim());
      }
    }

    // date / start / end (also accept startDate/endDate and remap)
    const start = params.start || params.startDate;
    const end = params.end || params.endDate;
    if (params.date) q.set("date", String(params.date));
    if (start) q.set("start", String(start));
    if (end) q.set("end", String(end));

    // optional flags
    if (params.tz) q.set("tz", String(params.tz));
    if (typeof params.includeUsers === "boolean") {
      q.set("includeUsers", String(params.includeUsers));
    }

    const qs = q.toString();
    const url = `/leads/export${qs ? `?${qs}` : ""}`;

    const { blob, filename, contentType, size } = await apiDownload(url, true);
    forceDownload(blob, params.fileName || filename);

    return { filename, size, contentType };
  } catch (err: any) {
    return rejectWithValue(
      err?.message || "Failed to export leads. Please try again."
    );
  }
});