import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Info, TriangleAlert, Mail, CheckCircle2 } from "lucide-react";
import AttendanceBadge from "../components/AttendanceBadge";
import {
  exportSessionCsvUrl,
  getSession,
  getSchedules,
  updateAttendanceStatus,
  updateSessionNotes,
  getDailyEmailStatus,
  sendDailyEmails,
} from "../api";

const getNumericConfidence = (confidence) =>
  Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : null;

const getConfidenceStyles = (confidence) => {
  if (confidence >= 85) {
    return {
      bar: "bg-green-500",
      text: "text-green-700",
      track: "bg-green-100",
    };
  }

  if (confidence >= 70) {
    return {
      bar: "bg-amber-500",
      text: "text-amber-700",
      track: "bg-amber-100",
    };
  }

  return {
    bar: "bg-red-500",
    text: "text-red-700",
    track: "bg-red-100",
  };
};

export default function Results() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // {sent, timestamp} or null
  const [sendingEmails, setSendingEmails] = useState(false);

  const loadData = async () => {
    try {
      const [sessionRes, scheduleRes] = await Promise.all([
        getSession(sessionId),
        getSchedules(),
      ]);
      setSession(sessionRes.data);
      setSchedules(scheduleRes.data);
      setNotes(sessionRes.data.notes || "");

      // Load daily email status for this session's date
      // Prefer session_date (local IST date) over date (UTC server date)
      const sessionDate = sessionRes.data.session_date || sessionRes.data.date;
      if (sessionDate) {
        try {
          const statusRes = await getDailyEmailStatus(sessionDate);
          setEmailStatus(statusRes.data?.sent ? statusRes.data : null);
        } catch {
          // ignore
        }
      }
    } catch {
      toast.error("Could not load session");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const summary = useMemo(() => {
    if (!session) return { present: 0, unknown: 0, absent: 0 };
    return {
      present: session.results.filter((r) => r.status === "present").length,
      unknown: session.results.filter((r) => r.status === "unknown").length,
      absent: session.absent_students.length,
    };
  }, [session]);

  const scheduleName = useMemo(() => {
    if (!session || !session.schedule_id) return "No schedule linked";
    const s = schedules.find((x) => x.id === session.schedule_id);
    return s ? `${s.subject} (${s.type})` : "Unknown Schedule";
  }, [session, schedules]);

  const lowConfidenceResults = useMemo(() => {
    if (!session) return [];

    return session.results.filter((row) => {
      const confidence = getNumericConfidence(row.confidence);
      return row.status === "present" && confidence !== null && confidence < 70;
    });
  }, [session]);

  const toggleStatus = async (student, currentStatus) => {
    const newStatus = currentStatus === "present" ? "absent" : "present";
    try {
      await updateAttendanceStatus(session.session_id, {
        student_id: student.student_id,
        status: newStatus,
        name: student.name,
        roll_number: student.roll_number,
      });
      toast.success("Status updated");
      loadData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await updateSessionNotes(sessionId, { notes });
      toast.success("Session notes saved");
    } catch (err) {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) return <p>Loading results...</p>;
  if (!session) return <p>No session found.</p>;

  const renderConfidenceCell = (row) => {
    const confidence = getNumericConfidence(row.confidence);

    if (row.status !== "present" || confidence === null) {
      return <span className="text-slate-400">—</span>;
    }

    const styles = getConfidenceStyles(confidence);

    return (
      <div className="w-32 space-y-1">
        <div className={`text-xs font-semibold ${styles.text}`}>
          {confidence.toFixed(1)}%
        </div>
        <div className={`h-2 overflow-hidden rounded-full ${styles.track}`}>
          <div
            className={`h-full rounded-full ${styles.bar}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Attendance Results</h1>
          <p className="text-slate-500 mt-1 font-medium">Review and verify automatically generated attendance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Session ID</p>
          <p className="text-lg font-mono font-bold text-slate-800 break-all">{session.session_id}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Schedule</p>
          <p className="text-lg font-bold text-slate-800">{scheduleName}</p>
        </div>
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <p className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2 relative z-10">Summary</p>
          <div className="flex gap-4 relative z-10">
            <div>
              <span className="block text-2xl font-extrabold text-emerald-600 leading-none">{summary.present}</span>
              <span className="text-xs font-bold text-emerald-700/70 uppercase">Present</span>
            </div>
            <div className="w-px bg-indigo-200/50"></div>
            <div>
              <span className="block text-2xl font-extrabold text-amber-500 leading-none">{summary.unknown}</span>
              <span className="text-xs font-bold text-amber-600/70 uppercase">Unknown</span>
            </div>
            <div className="w-px bg-indigo-200/50"></div>
            <div>
              <span className="block text-2xl font-extrabold text-rose-500 leading-none">{summary.absent}</span>
              <span className="text-xs font-bold text-rose-600/70 uppercase">Absent</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
           <Info size={16} className="text-slate-400" /> Session Notes <span className="text-xs font-medium text-slate-400 normal-case">(Visible to Students)</span>
        </label>
        <textarea
          className="w-full border-2 border-slate-100 rounded-xl p-4 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50 focus:bg-white"
          rows={2}
          placeholder="e.g. Covered Chapter 5, discussion on midterms..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-md shadow-slate-900/10 active:scale-95"
          >
            {savingNotes ? "Saving..." : "Save Notes"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4 flex flex-col">
          {(session.annotated_image_urls && session.annotated_image_urls.length > 0
            ? session.annotated_image_urls
            : [session.annotated_image_url]
          ).filter(Boolean).map((url, idx) => (
            <div key={idx} className="rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white relative group">
              <img
                src={url}
                alt={`annotated group ${idx + 1}`}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 border border-slate-100 rounded-2xl pointer-events-none"></div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {lowConfidenceResults.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <TriangleAlert size={18} />
                <h2 className="text-sm font-semibold">Low Confidence Alerts</h2>
              </div>
              <div className="mt-3 space-y-2 text-sm text-amber-900">
                {lowConfidenceResults.map((row, idx) => (
                  <div
                    key={`${row.student_id || row.name}-${idx}`}
                    className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2"
                  >
                    <span className="font-medium">{row.name}</span>
                    <span>
                      {getNumericConfidence(row.confidence)?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">
                    <span className="inline-flex items-center gap-1">
                      Confidence
                      <span
                        className="text-slate-400"
                        title="Confidence shows how closely the face matched the registered photos"
                        aria-label="Confidence shows how closely the face matched the registered photos"
                      >
                        <Info size={14} />
                      </span>
                    </span>
                  </th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {session.results.map((row, idx) => (
                  <tr className="border-t" key={idx}>
                    <td className="p-2">
                      <p className="font-semibold">{row.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.roll_number || "—"}
                      </p>
                    </td>
                    <td className="p-2">
                      <AttendanceBadge
                        status={row.status}
                        confidence={row.confidence}
                      />
                    </td>
                    <td className="p-2">{renderConfidenceCell(row)}</td>
                    <td className="p-2 text-right">
                      {row.status === "present" && (
                        <button
                          onClick={() => toggleStatus(row, "present")}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Mark Absent
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {session.absent_students.map((s) => (
                  <tr className="border-t" key={s.student_id}>
                    <td className="p-2">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.roll_number}</p>
                    </td>
                    <td className="p-2">
                      <AttendanceBadge status="absent" confidence={null} />
                    </td>
                    <td className="p-2">
                      <span className="text-slate-400">—</span>
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => toggleStatus(s, "absent")}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Mark Present
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <div className="flex flex-wrap gap-3">
          <a
            href={exportSessionCsvUrl(sessionId)}
            className="px-5 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            Export CSV
          </a>
          <button
            onClick={async () => {
              try {
                setSendingEmails(true);
                const date = session?.session_date || session?.date;
                const res = await sendDailyEmails(date);
                toast.success(`Daily emails sent to ${res.data.sent} student(s)`);
                // Refresh email status
                if (date) {
                  const statusRes = await getDailyEmailStatus(date);
                  setEmailStatus(statusRes.data?.sent ? statusRes.data : null);
                }
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to send emails');
              } finally {
                setSendingEmails(false);
              }
            }}
            disabled={sendingEmails}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 disabled:opacity-60 transition-colors"
          >
            <Mail size={18} />
            {sendingEmails ? 'Sending…' : 'Send Summary Emails'}
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Daily email status indicator */}
          {emailStatus?.sent && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700">
              <CheckCircle2 size={16} />
              Emails sent ✓
            </div>
          )}
          
          <Link
            to="/take-attendance"
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            Take New Attendance
          </Link>
        </div>
      </div>
    </div>
  );
}
